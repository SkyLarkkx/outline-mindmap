import { describe, expect, it } from 'vitest'
import {
  DESKTOP_PERFORMANCE_NODE_THRESHOLD,
  normalizePerformanceMode,
  PERFORMANCE_NODE_THRESHOLD,
  shouldUsePerformanceMode,
} from '../settings/PerformanceMode'
import type { MindNode } from '../core/types'
import type { Box, LayoutResult } from '../layout/types'
import { intersects, nodesInViewport } from '../view/visibility'

function node(id: string): MindNode {
  return {
    id, text: id, depth: 1, kind: 'heading', children: [], parent: null,
    titleLine: 0, bodyEnd: 0, blockStart: 0, blockEnd: 0, collapsed: false,
  }
}

describe('performance mode', () => {
  it('normalizes unknown values to auto', () => {
    expect(normalizePerformanceMode(undefined)).toBe('auto')
    expect(normalizePerformanceMode('bad')).toBe('auto')
    expect(normalizePerformanceMode('on')).toBe('on')
    expect(normalizePerformanceMode('off')).toBe('off')
  })

  it('uses 500 on mobile and 800 on desktop for the auto mode', () => {
    expect(shouldUsePerformanceMode('auto', true, PERFORMANCE_NODE_THRESHOLD)).toBe(false)
    expect(shouldUsePerformanceMode('auto', true, PERFORMANCE_NODE_THRESHOLD + 1)).toBe(true)
    expect(shouldUsePerformanceMode('auto', false, DESKTOP_PERFORMANCE_NODE_THRESHOLD)).toBe(false)
    expect(shouldUsePerformanceMode('auto', false, DESKTOP_PERFORMANCE_NODE_THRESHOLD + 1)).toBe(true)
    expect(shouldUsePerformanceMode('on', false, 1)).toBe(true)
    expect(shouldUsePerformanceMode('off', true, 5000)).toBe(false)
  })
})

describe('viewport culling', () => {
  const viewport: Box = { x: 100, y: 100, w: 200, h: 100 }

  it('intersects only boxes with a positive-area overlap', () => {
    expect(intersects({ x: 150, y: 120, w: 50, h: 50 }, viewport)).toBe(true)
    expect(intersects({ x: 300, y: 100, w: 20, h: 20 }, viewport)).toBe(false)
    expect(intersects({ x: 100, y: 100, w: 20, h: 20 }, viewport)).toBe(true)
    expect(intersects({ x: 0, y: 0, w: 20, h: 20 }, viewport)).toBe(false)
  })

  it('returns intersecting nodes and the ids used by edge culling', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const boxes: LayoutResult = new Map([
      ['a', { x: 120, y: 110, w: 30, h: 20 }],
      ['b', { x: 280, y: 160, w: 50, h: 20 }],
      ['c', { x: 500, y: 500, w: 30, h: 20 }],
    ])
    const visible = nodesInViewport(nodes, boxes, viewport)
    expect(visible.nodes.map(n => n.id)).toEqual(['a', 'b'])
    expect([...visible.ids]).toEqual(['a', 'b'])
  })
})
