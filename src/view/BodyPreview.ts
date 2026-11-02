/**
 * 节点正文预览。
 *
 * 只做展示：正文从 MindTree 的原始行里取，交给 Obsidian 自己的 MarkdownRenderer，
 * 因此 HTML、图片、公式、内嵌笔记等行为与阅读视图一致。笔记仍然是唯一数据源，
 * 这里不生成任何要写回的文本。
 *
 * 悬浮态锚定节点；点图钉后变成右侧面板。渲染是异步的，用 token 丢弃已经过期的结果，
 * 每次渲染使用一个独立的 Component 托管内嵌内容的生命周期。
 */

import {
  Component,
  MarkdownRenderer,
  finishRenderMath,
  setIcon,
  type App,
} from 'obsidian'
import { t } from '../i18n'

export type BodyPreviewMode = 'hover' | 'pinned'

export interface BodyPreviewState {
  nodeId: string
  title: string
  markdown: string
  sourcePath: string
  /** 0-based，包含。 */
  fromLine: number
  /** 0-based，不包含。 */
  toLine: number
}

export interface BodyPreviewOptions {
  app: App
  host: HTMLElement
  getAnchor: (nodeId: string) => DOMRect | null
  onPinnedChange?: (pinned: boolean) => void
  /** 预览按钮/关闭键操作后把焦点还给画布。 */
  onRequestFocus?: () => void
}

const EDGE_MARGIN = 12
const HOVER_GAP = 10

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export class BodyPreview {
  /** 视图把 pointerenter / pointerleave 挂在这个元素上，决定悬浮态是否继续存活。 */
  readonly el: HTMLElement
  private readonly titleEl: HTMLElement
  private readonly metaEl: HTMLElement
  private readonly contentEl: HTMLElement
  private readonly pinButton: HTMLButtonElement
  private readonly closeButton: HTMLButtonElement

  private state: BodyPreviewState | null = null
  private mode: BodyPreviewMode = 'hover'
  private open = false
  private renderToken = 0
  private renderComponent: Component | null = null

  constructor(private readonly options: BodyPreviewOptions) {
    this.el = options.host.createDiv({ cls: 'om-preview' })
    this.el.addClass('is-hidden')
    this.el.setAttribute('role', 'dialog')
    this.el.setAttribute('aria-label', t('preview.title'))

    const header = this.el.createDiv({ cls: 'om-preview-header' })
    const heading = header.createDiv({ cls: 'om-preview-heading' })
    this.titleEl = heading.createDiv({ cls: 'om-preview-title' })
    this.metaEl = heading.createDiv({ cls: 'om-preview-meta' })

    const actions = header.createDiv({ cls: 'om-preview-actions' })
    this.pinButton = actions.createEl('button', { cls: 'om-preview-action' })
    this.pinButton.addClass('om-preview-pin')
    this.pinButton.type = 'button'
    this.pinButton.setAttribute('aria-label', t('preview.pin'))
    setIcon(this.pinButton, 'pin')

    this.closeButton = actions.createEl('button', { cls: 'om-preview-action' })
    this.closeButton.addClass('om-preview-close')
    this.closeButton.type = 'button'
    this.closeButton.setAttribute('aria-label', t('preview.close'))
    setIcon(this.closeButton, 'x')

    this.contentEl = this.el.createDiv({ cls: 'om-preview-content' })
    this.contentEl.addClass('markdown-rendered')

    this.pinButton.addEventListener('click', this.onPinClick)
    this.closeButton.addEventListener('click', this.onCloseClick)
    this.contentEl.addEventListener('click', this.onContentClick)
    this.el.addEventListener('keydown', this.onKeyDown)
  }

  get pinned(): boolean {
    return this.mode === 'pinned' && this.open
  }

  get visible(): boolean {
    return this.open
  }

  get nodeId(): string | null {
    return this.state?.nodeId ?? null
  }

  /** 悬浮态打开或切换节点；已经钉住时忽略，避免把侧栏内容换成悬停内容。 */
  showHover(state: BodyPreviewState): void {
    if (this.mode === 'pinned') return
    this.mode = 'hover'
    this.el.removeClass('is-pinned')
    this.el.addClass('is-hover')
    this.open = true
    this.el.removeClass('is-hidden')
    this.setState(state)
    this.positionHover()
  }

  /** 打开右侧面板。 */
  showPinned(state: BodyPreviewState): void {
    const wasPinned = this.pinned
    this.mode = 'pinned'
    this.open = true
    this.el.removeClass('is-hover')
    this.el.addClass('is-pinned')
    this.el.removeClass('is-hidden')
    // 悬浮态留下的 left / top 是行内样式，会盖住 .is-pinned 的 right / top。
    this.el.setCssStyles({ left: '', top: '' })
    this.setState(state)
    if (!wasPinned) this.options.onPinnedChange?.(true)
  }

  /** 树刷新后，用同一个节点的最新正文更新；换节点的职责留给视图。 */
  update(state: BodyPreviewState): void {
    if (!this.open || this.state?.nodeId !== state.nodeId) return
    this.setState(state)
  }

  hideHover(restoreFocus = false): void {
    if (this.mode !== 'hover' || !this.open) return
    this.close(restoreFocus)
  }

  close(restoreFocus = false): void {
    const wasPinned = this.pinned
    const wasOpen = this.open
    this.renderToken++
    this.disposeRender()
    this.state = null
    this.open = false
    this.mode = 'hover'
    this.el.addClass('is-hidden')
    this.el.removeClass('is-pinned', 'is-hover')
    this.contentEl.empty()
    this.titleEl.setText('')
    this.metaEl.setText('')
    if (wasPinned) this.options.onPinnedChange?.(false)
    if (restoreFocus && wasOpen) this.options.onRequestFocus?.()
  }

  destroy(): void {
    this.renderToken++
    this.disposeRender()
    this.pinButton.removeEventListener('click', this.onPinClick)
    this.closeButton.removeEventListener('click', this.onCloseClick)
    this.contentEl.removeEventListener('click', this.onContentClick)
    this.el.removeEventListener('keydown', this.onKeyDown)
    this.el.remove()
    this.state = null
    this.open = false
  }

  // ── 内容 ────────────────────────────────────────────────────

  private setState(state: BodyPreviewState): void {
    const previous = this.state
    this.state = state
    this.titleEl.setText(state.title || t('preview.untitled'))
    this.titleEl.setAttribute('title', state.title || t('preview.untitled'))
    this.metaEl.setText(t('preview.meta', state.fromLine + 1, state.toLine))

    const changed =
      !previous ||
      previous.nodeId !== state.nodeId ||
      previous.markdown !== state.markdown ||
      previous.sourcePath !== state.sourcePath
    if (changed) void this.render(state)
    else if (this.mode === 'hover') this.positionHover()
  }

  private async render(state: BodyPreviewState): Promise<void> {
    const token = ++this.renderToken
    this.disposeRender()
    this.contentEl.empty()
    const status = this.contentEl.createDiv({ cls: 'om-preview-status', text: t('preview.loading') })
    const stage = this.contentEl.createDiv({ cls: 'om-preview-rendered' })
    stage.addClass('markdown-rendered')
    const component = new Component()
    component.load()

    try {
      await MarkdownRenderer.render(this.options.app, state.markdown, stage, state.sourcePath, component)
      if (token !== this.renderToken) {
        component.unload()
        stage.remove()
        return
      }
      status.remove()
      this.renderComponent = component
      void finishRenderMath().catch((err: unknown) => {
        console.warn('[outline-mindmap] finishRenderMath failed', err)
      })
      if (this.mode === 'hover') this.positionHover()
    } catch (err: unknown) {
      component.unload()
      stage.remove()
      if (token !== this.renderToken) return
      status.remove()
      this.contentEl.createDiv({ cls: 'om-preview-status', text: t('preview.error') }).addClass('is-error')
      this.contentEl.createEl('pre', { cls: 'om-preview-source', text: state.markdown })
      console.warn('[outline-mindmap] body preview render failed', err)
    }
  }

  private disposeRender(): void {
    this.renderComponent?.unload()
    this.renderComponent = null
  }

  private positionHover(): void {
    if (this.mode !== 'hover' || !this.open || !this.state) return
    const anchor = this.options.getAnchor(this.state.nodeId)
    const host = this.el.parentElement
    if (!anchor || !host) return

    const hostRect = host.getBoundingClientRect()
    const hostWidth = hostRect.width || host.clientWidth
    const hostHeight = hostRect.height || host.clientHeight
    const panelWidth = this.el.offsetWidth || 380
    const panelHeight = this.el.offsetHeight || 260
    if (hostWidth <= 0 || hostHeight <= 0) return

    let left = anchor.right - hostRect.left + HOVER_GAP
    if (left + panelWidth > hostWidth - EDGE_MARGIN) {
      left = anchor.left - hostRect.left - panelWidth - HOVER_GAP
    }
    left = clamp(left, EDGE_MARGIN, Math.max(EDGE_MARGIN, hostWidth - panelWidth - EDGE_MARGIN))

    const top = clamp(
      anchor.top - hostRect.top,
      EDGE_MARGIN,
      Math.max(EDGE_MARGIN, hostHeight - panelHeight - EDGE_MARGIN),
    )
    this.el.setCssStyles({ left: `${left}px`, top: `${top}px` })
  }

  // ── 交互 ────────────────────────────────────────────────────

  private readonly onPinClick = (e: MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (!this.open || this.mode === 'pinned' || !this.state) return
    this.showPinned(this.state)
    this.options.onRequestFocus?.()
  }

  private readonly onCloseClick = (e: MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    this.close(true)
  }

  private readonly onContentClick = (e: MouseEvent): void => {
    if (e.defaultPrevented) return
    const link = (e.target as HTMLElement | null)?.closest('a.internal-link') as HTMLAnchorElement | null
    if (!link || !this.state) return
    e.preventDefault()
    e.stopPropagation()
    const href = link.getAttribute('data-href') ?? link.getAttribute('href')
    if (!href) return
    // 永远开新标签：这里的预览可能就在主区域，直接替换当前叶会把导图关掉。
    void this.options.app.workspace.openLinkText(href, this.state.sourcePath, true)
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !this.open) return
    e.preventDefault()
    e.stopPropagation()
    this.close(true)
  }
}
