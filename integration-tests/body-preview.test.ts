import { describe, expect, it, vi } from 'vitest'
import { BodyPreview } from '../src/view/BodyPreview'
import { FakeElement, findByClass } from './fake-dom'

function rect(left: number, top: number, right: number, bottom: number): DOMRect {
  return {
    left, top, right, bottom, width: right - left, height: bottom - top,
    x: left, y: top, toJSON: () => ({}),
  } as DOMRect
}

describe('body preview', () => {
  it('renders through MarkdownRenderer, pins and closes with callbacks', async () => {
    const host = new FakeElement()
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    host.getBoundingClientRect = () => rect(0, 0, 800, 600)
    const openLinkText = vi.fn()
    const pinned = vi.fn(), focus = vi.fn()
    const preview = new BodyPreview({
      app: { workspace: { openLinkText } } as any,
      host: host as any,
      getAnchor: () => rect(100, 100, 220, 140),
      onPinnedChange: pinned,
      onRequestFocus: focus,
    })
    Object.defineProperty(preview.el, 'offsetWidth', { value: 380 })
    Object.defineProperty(preview.el, 'offsetHeight', { value: 260 })

    const state = {
      nodeId: 'n1', title: '标题', markdown: '正文\n\n![图](a.png)', sourcePath: 'a.md',
      fromLine: 2, toLine: 4,
    }
    preview.showHover(state)
    await vi.waitFor(() => {
      expect(findByClass(host, 'om-preview-rendered')[0]?.children.length).toBeGreaterThan(0)
    })
    expect(findByClass(host, 'om-preview')[0]?.classList.contains('is-hidden')).toBe(false)
    expect(pinned).not.toHaveBeenCalled()

    const pin = findByClass(host, 'om-preview-pin')[0]!
    pin.dispatch('click')
    expect(preview.pinned).toBe(true)
    expect(pinned).toHaveBeenCalledWith(true)
    expect(focus).toHaveBeenCalled()

    const close = findByClass(host, 'om-preview-close')[0]!
    close.dispatch('click')
    expect(preview.visible).toBe(false)
    expect(pinned).toHaveBeenLastCalledWith(false)
    expect(findByClass(host, 'om-preview')[0]?.classList.contains('is-hidden')).toBe(true)

    preview.destroy()
    expect(host.children).toEqual([])
  })

  it('opens a transient touch preview and hides it on demand', async () => {
    const host = new FakeElement()
    const preview = new BodyPreview({
      app: { workspace: { openLinkText: vi.fn() } } as any,
      host: host as any,
      getAnchor: () => rect(0, 0, 100, 40),
    })
    const state = {
      nodeId: 'n2', title: '长按标题', markdown: '长按正文', sourcePath: 'a.md',
      fromLine: 5, toLine: 6,
    }
    preview.showTouch(state)
    expect(preview.visible).toBe(true)
    expect(preview.pinned).toBe(false)
    expect(findByClass(host, 'om-preview')[0]?.classList.contains('is-touch')).toBe(true)
    await vi.waitFor(() => {
      expect(findByClass(host, 'om-preview-rendered')[0]?.children.length).toBeGreaterThan(0)
    })
    preview.hideTouch()
    expect(preview.visible).toBe(false)
    expect(findByClass(host, 'om-preview')[0]?.classList.contains('is-hidden')).toBe(true)
    preview.destroy()
  })
})
