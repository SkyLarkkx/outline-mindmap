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

export type BodyPreviewMode = 'hover' | 'pinned' | 'touch'

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
  /** 触屏面板自行关闭（关闭键）后，让视图把长按状态一起复位。 */
  onTouchClosed?: () => void
  /** 预览按钮/关闭键操作后把焦点还给画布。 */
  onRequestFocus?: () => void
}

const EDGE_MARGIN = 12
const HOVER_GAP = 10
const MIN_PINNED_WIDTH = 260
const MIN_PINNED_HEIGHT = 160

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

interface ResizeSession {
  pointerId: number
  startX: number
  startY: number
  width: number
  height: number
}

export class BodyPreview {
  /** 视图把 pointerenter / pointerleave 挂在这个元素上，决定悬浮态是否继续存活。 */
  readonly el: HTMLElement
  private readonly titleEl: HTMLElement
  private readonly metaEl: HTMLElement
  private readonly contentEl: HTMLElement
  private readonly pinButton: HTMLButtonElement
  private readonly closeButton: HTMLButtonElement
  private readonly resizeHandle: HTMLElement

  private state: BodyPreviewState | null = null
  private mode: BodyPreviewMode = 'hover'
  private open = false
  private renderToken = 0
  private renderComponent: Component | null = null
  /** 固定面板手动调过的大小；关掉再打开仍然沿用。 */
  private pinnedSize: { width: number; height: number } | null = null
  private resize: ResizeSession | null = null

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

    this.resizeHandle = this.el.createDiv({ cls: 'om-preview-resize' })
    this.resizeHandle.setAttribute('role', 'separator')
    this.resizeHandle.setAttribute('aria-label', t('preview.resize'))

    this.pinButton.addEventListener('click', this.onPinClick)
    this.closeButton.addEventListener('click', this.onCloseClick)
    this.contentEl.addEventListener('click', this.onContentClick)
    this.el.addEventListener('keydown', this.onKeyDown)
    this.resizeHandle.addEventListener('pointerdown', this.onResizePointerDown)
    this.resizeHandle.addEventListener('pointermove', this.onResizePointerMove)
    this.resizeHandle.addEventListener('pointerup', this.onResizePointerUp)
    this.resizeHandle.addEventListener('pointercancel', this.onResizePointerUp)
    this.resizeHandle.addEventListener('lostpointercapture', this.onResizePointerUp)
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
    this.el.removeClass('is-pinned', 'is-touch')
    this.el.addClass('is-hover')
    this.open = true
    this.el.removeClass('is-hidden')
    this.clearPinnedSizeStyles()
    this.setState(state)
    this.positionHover()
  }

  /** 触屏长按：停靠为视图上方面板，松开后由视图调用 hideTouch()。 */
  showTouch(state: BodyPreviewState): void {
    if (this.mode === 'pinned') return
    this.mode = 'touch'
    this.open = true
    this.el.removeClass('is-hover', 'is-pinned')
    this.el.addClass('is-touch')
    this.el.removeClass('is-hidden')
    // 悬浮态的 left/top 是行内样式；touch 模式用 CSS 固定上方。
    this.clearPinnedSizeStyles()
    this.el.setCssStyles({ left: '', top: '' })
    this.setState(state)
  }

  /** 打开右侧面板。 */
  showPinned(state: BodyPreviewState): void {
    const wasPinned = this.pinned
    this.mode = 'pinned'
    this.open = true
    this.el.removeClass('is-hover', 'is-touch')
    this.el.addClass('is-pinned')
    this.el.removeClass('is-hidden')
    // 悬浮态留下的 left / top 是行内样式，会盖住 .is-pinned 的 right / top。
    this.el.setCssStyles({ left: '', top: '' })
    this.applyPinnedSize()
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

  hideTouch(): void {
    if (this.mode !== 'touch' || !this.open) return
    this.close(false)
  }

  close(restoreFocus = false): void {
    const wasPinned = this.pinned
    const wasOpen = this.open
    const closedMode = this.mode
    this.endResize()
    this.renderToken++
    this.disposeRender()
    this.state = null
    this.open = false
    this.mode = 'hover'
    this.el.addClass('is-hidden')
    this.el.removeClass('is-pinned', 'is-hover', 'is-touch')
    this.clearPinnedSizeStyles()
    this.contentEl.empty()
    this.titleEl.setText('')
    this.metaEl.setText('')
    if (wasPinned) this.options.onPinnedChange?.(false)
    if (closedMode === 'touch') this.options.onTouchClosed?.()
    if (restoreFocus && wasOpen) this.options.onRequestFocus?.()
  }

  destroy(): void {
    this.endResize()
    this.renderToken++
    this.disposeRender()
    this.pinButton.removeEventListener('click', this.onPinClick)
    this.closeButton.removeEventListener('click', this.onCloseClick)
    this.contentEl.removeEventListener('click', this.onContentClick)
    this.el.removeEventListener('keydown', this.onKeyDown)
    this.resizeHandle.removeEventListener('pointerdown', this.onResizePointerDown)
    this.resizeHandle.removeEventListener('pointermove', this.onResizePointerMove)
    this.resizeHandle.removeEventListener('pointerup', this.onResizePointerUp)
    this.resizeHandle.removeEventListener('pointercancel', this.onResizePointerUp)
    this.resizeHandle.removeEventListener('lostpointercapture', this.onResizePointerUp)
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

  private applyPinnedSize(): void {
    if (!this.pinnedSize) return
    this.el.setCssStyles({
      width: `${this.pinnedSize.width}px`,
      height: `${this.pinnedSize.height}px`,
    })
  }

  private clearPinnedSizeStyles(): void {
    this.el.setCssStyles({ width: '', height: '' })
  }

  private endResize(): void {
    const session = this.resize
    this.resize = null
    this.el.removeClass('is-resizing')
    if (session && this.resizeHandle.hasPointerCapture?.(session.pointerId)) {
      this.resizeHandle.releasePointerCapture?.(session.pointerId)
    }
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

  // ── 固定面板缩放 ────────────────────────────────────────────

  private readonly onResizePointerDown = (e: PointerEvent): void => {
    if (this.mode !== 'pinned' || !this.open) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const rect = this.el.getBoundingClientRect()
    this.resize = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: rect.width,
      height: rect.height,
    }
    this.el.addClass('is-resizing')
    this.resizeHandle.setPointerCapture?.(e.pointerId)
  }

  private readonly onResizePointerMove = (e: PointerEvent): void => {
    const session = this.resize
    if (!session || session.pointerId !== e.pointerId) return
    const host = this.el.parentElement
    if (!host) return
    e.preventDefault()
    e.stopPropagation()
    const hostRect = host.getBoundingClientRect()
    const panelRect = this.el.getBoundingClientRect()
    const maxWidth = Math.max(1, hostRect.width - EDGE_MARGIN * 2)
    const bottom = Math.max(0, hostRect.bottom - panelRect.bottom)
    const maxHeight = Math.max(1, hostRect.height - bottom - EDGE_MARGIN)
    const minWidth = Math.min(MIN_PINNED_WIDTH, maxWidth)
    const minHeight = Math.min(MIN_PINNED_HEIGHT, maxHeight)
    // 面板靠右 / 靠下，所以拖左上角时：向左变宽、向上变高。
    const width = clamp(session.width - (e.clientX - session.startX), minWidth, maxWidth)
    const height = clamp(session.height - (e.clientY - session.startY), minHeight, maxHeight)
    this.pinnedSize = { width, height }
    this.el.setCssStyles({ width: `${width}px`, height: `${height}px` })
  }

  private readonly onResizePointerUp = (e: PointerEvent): void => {
    if (!this.resize || this.resize.pointerId !== e.pointerId) return
    e.preventDefault()
    e.stopPropagation()
    this.endResize()
  }
}
