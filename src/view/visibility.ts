/**
 * 视口裁剪。纯几何函数，不依赖 DOM，方便单测。
 */

import type { MindNode } from '../core/types'
import type { Box, LayoutResult } from '../layout/types'

/** 两个盒子是否有交集。相接不算交集，避免边界上反复创建/释放节点。 */
export function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/**
 * 从当前可见节点里挑出与视口相交的一部分。
 *
 * 返回的 `ids` 同时也给连线层做边裁剪：只要边的任意一端在视口里，就保留这条边，
 * 这样子节点在屏幕边缘时不会因为父节点刚出屏而丢掉半截连线。
 */
export function nodesInViewport(
  nodes: readonly MindNode[],
  boxes: LayoutResult,
  viewport: Box,
): { nodes: MindNode[]; ids: Set<string> } {
  const visible: MindNode[] = []
  const ids = new Set<string>()
  for (const node of nodes) {
    const box = boxes.get(node.id)
    if (!box || !intersects(box, viewport)) continue
    visible.push(node)
    ids.add(node.id)
  }
  return { nodes: visible, ids }
}
