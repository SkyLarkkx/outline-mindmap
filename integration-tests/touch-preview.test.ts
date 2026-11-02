import { afterEach, describe, expect, it, vi } from 'vitest'
import { MindmapView } from '../src/view/MindmapView'
import { StyleStore } from '../src/settings/StyleStore'
import { normalizeSettings } from '../src/settings/SettingsTab'
import { ViewPreferences } from '../src/settings/ViewPreferences'
import { FileHistory } from '../src/doc/FileHistory'
import { FakeElement, findByClass } from './fake-dom'
import { MarkdownView, TFile } from './obsidian-runtime'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('touch body preview', () => {
  it('stays open after release once the panel is touched, and coexists with the pinned preview', async () => {
    vi.useFakeTimers()
    let resize!: (entries: any[]) => void
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: any) { resize = callback }
      observe() {}
      disconnect() {}
    })
    const win = {
      performance,
      requestAnimationFrame: vi.fn(() => 1),
      cancelAnimationFrame: vi.fn(),
      matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      setTimeout: (callback: () => void, ms = 0) => setTimeout(callback, ms),
      clearTimeout: (id: number) => clearTimeout(id),
    }
    vi.stubGlobal('window', win)

    const settings = normalizeSettings(null)
    const save = vi.fn()
    const preferences = new ViewPreferences(settings.views, save)
    const file = new TFile('touch.md')
    const source = '# 标题\n\n这是正文。\n\n## 子标题\n\n子正文。'
    const markdown = new MarkdownView()
    markdown.file = file
    markdown.editor = { getValue: () => source }
    markdown.getMode = () => 'source'
    const leaf = { view: markdown, getViewState: () => ({ state: { file: file.path } }) }
    const app: any = {
      workspace: {
        getActiveFile: () => file,
        getLeavesOfType: () => [leaf],
        on: vi.fn(),
      },
      vault: { on: vi.fn(), cachedRead: async () => source },
    }
    const view: any = new MindmapView({ app } as any, {
      settings,
      preferences,
      styles: new StyleStore(settings.styles, save),
      fileHistory: new FileHistory(),
    } as any)
    view.contentEl.ownerDocument = { defaultView: win }
    view.draw = vi.fn(() => {
      if (view.tree) {
        view.boxes = new Map([
          [view.tree.root.children[0].id, { x: 150, y: 50, w: 100, h: 100 }],
        ])
      }
    })

    await view.onOpen()
    resize([{ contentRect: { width: 800, height: 600 } }])

    const title = view.tree.root.children[0]
    const node = (view.nodeLayer as FakeElement).createDiv({ cls: 'om-node' })
    node.dataset['nodeId'] = title.id
    const send = (type: string, target: FakeElement, input: Record<string, unknown> = {}) =>
      target.dispatch(type, { pointerId: 11, pointerType: 'touch', button: 0, ...input })

    // Toolbar-pinned preview is already open.
    view.setSelection(title.id)
    view.togglePinnedPreview()
    expect(view.bodyPreview.visible).toBe(true)

    // Long press opens a second, independent top sheet.
    send('pointerdown', node, { clientX: 100, clientY: 100 })
    vi.advanceTimersByTime(500)
    expect(view.touchPreview.visible).toBe(true)
    expect(view.bodyPreview.visible).toBe(true)
    expect(findByClass(view.contentEl, 'om-preview').length).toBe(2)

    // Touching the sheet engages it; releasing the original finger must not hide it.
    send('pointerdown', view.touchPreview.el as FakeElement, { pointerId: 12 })
    expect(view.touchPreviewEngaged).toBe(true)
    send('pointerup', view.canvas.viewport as FakeElement)
    expect(view.touchPreview.visible).toBe(true)

    // A press on the canvas dismisses only the touch sheet; the pinned one remains.
    send('pointerdown', view.canvas.viewport as FakeElement, { pointerId: 13 })
    expect(view.touchPreview.visible).toBe(false)
    expect(view.bodyPreview.visible).toBe(true)

    await view.onClose()
    view.unload()
  })
})
