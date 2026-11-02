import { describe, expect, it } from 'vitest'
import type { MindNode } from '../src/core/types'
import type { LayoutResult } from '../src/layout/types'
import { Connectors } from '../src/view/Connectors'
import { FakeElement, findByClass } from './fake-dom'

function node(id: string, parent: MindNode | null = null): MindNode {
  return {
    id, text: id, depth: parent ? parent.depth + 1 : 1, kind: 'heading',
    children: [], parent, titleLine: 0, bodyEnd: 0, blockStart: 0, blockEnd: 0,
    collapsed: false,
  }
}

describe('connector culling', () => {
  it('renders only edges whose child node is in the rendered set', () => {
    const svg = new FakeElement('svg')
    const connectors = new Connectors(svg as any)
    const parent = node('p')
    const child = node('c', parent)
    parent.children = [child]
    const boxes: LayoutResult = new Map([
      ['p', { x: 0, y: 0, w: 100, h: 30 }],
      ['c', { x: 200, y: 100, w: 100, h: 30 }],
    ])
    const path = () => findByClass(svg, 'om-edges')[0]!.getAttribute('d')

    connectors.render([parent, child], boxes, 'straight', 400, 400, new Set(['c']))
    expect(path()).toContain('M100 15L200 115')

    connectors.render([parent, child], boxes, 'straight', 400, 400, new Set(['p']))
    expect(path()).toBe('')
    connectors.destroy()
  })
})
