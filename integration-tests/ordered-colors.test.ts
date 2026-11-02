import { afterEach, describe, expect, it, vi } from 'vitest'
import { NodeRenderer } from '../src/view/NodeRenderer'
import { FakeElement, findByClass } from './fake-dom'

afterEach(() => vi.unstubAllGlobals())

function stubDom(): void {
  vi.stubGlobal('createDiv', (options: { cls?: string }) => {
    const el = new FakeElement()
    if (options?.cls) el.addClass(options.cls)
    return el
  })
  vi.stubGlobal('createFragment', () => new FakeElement('#fragment', true))
}

function node(ordered: boolean, marker = ordered ? '1.' : '-') {
  return {
    id: 'n1', text: '标题', depth: 3, kind: 'list',
    list: { ordered, marker },
    children: [], parent: null,
    titleLine: 1, bodyEnd: 2, blockStart: 1, blockEnd: 2, collapsed: false,
  }
}

describe('ordered list node styling', () => {
  it('toggles the ordered/dot/paren classes as the source marker changes', () => {
    stubDom()
    const layer = new FakeElement()
    const renderer = new NodeRenderer(layer as any)
    const box = { x: 0, y: 0, w: 100, h: 40 }
    const boxes = new Map([['n1', box]])

    renderer.render([node(true, '1.') as any], boxes as any, new Set())
    const el = findByClass(layer, 'om-node')[0]!
    expect(el.classList.contains('om-list-ordered')).toBe(true)
    expect(el.classList.contains('om-list-ordered-dot')).toBe(true)
    expect(el.classList.contains('om-list-ordered-paren')).toBe(false)

    renderer.render([node(true, '2)') as any], boxes as any, new Set())
    expect(el.classList.contains('om-list-ordered-dot')).toBe(false)
    expect(el.classList.contains('om-list-ordered-paren')).toBe(true)

    renderer.render([node(false) as any], boxes as any, new Set())
    expect(el.classList.contains('om-list-ordered')).toBe(false)
    expect(el.classList.contains('om-list-ordered-dot')).toBe(false)
    expect(el.classList.contains('om-list-ordered-paren')).toBe(false)
    renderer.destroy()
  })
})
