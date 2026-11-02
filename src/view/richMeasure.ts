/**
 * 含 HTML 节点标题的 DOM 测量。
 *
 * 这里与 measure.ts 分开，是为了让 measure.ts 保持「不 import Obsidian」的纯模块：
 * richLabel.ts 要用 Obsidian 的 MathJax，不能把它带进纯文字测量的单元测试。
 */

import type { MindNode } from '../core/types'
import type { Size } from '../layout/types'
import { MAX_TEXT_WIDTH, PADDING_X, measureNode, type FontSpec } from './measure'
import { hasRichLabel, plainTextOf, renderRichLabel } from './richLabel'

/** 与 measure.ts 里的 BORDER 一致：.om-node 是 1px 边框。 */
const BORDER = 1
const RICH_CACHE_LIMIT = 2000
const MAX_RICH_NODE_WIDTH = MAX_TEXT_WIDTH + PADDING_X * 2 + BORDER * 2

const richCache = new Map<string, Size>()

function richKey(text: string, font: FontSpec): string {
  return `${font.key}\n${text}`
}

export function isRichNode(text: string): boolean {
  return hasRichLabel(text)
}

/**
 * 布局前批量测量含 HTML 的可见节点：一次建树、一次强制排版、一次读取全部 offsetWidth/Height。
 * 缓存命中时连测量层都不创建。纯文字节点不会进入这里。
 */
export function measureRichNodes(nodes: readonly MindNode[], font: FontSpec, host: HTMLElement): void {
  const misses = new Map<string, string>()
  for (const node of nodes) {
    if (!hasRichLabel(node.text)) continue
    const key = richKey(node.text, font)
    if (richCache.has(key) || misses.has(key)) continue
    misses.set(key, node.text)
  }
  if (misses.size === 0) return

  const layer = host.createDiv({ cls: 'om-measure-layer' })
  const pending: { key: string; text: string; el: HTMLElement }[] = []
  try {
    for (const [key, text] of misses) {
      const el = layer.createDiv({ cls: 'om-node om-node-measure' })
      el.setCssStyles({ maxWidth: `${MAX_RICH_NODE_WIDTH}px` })
      const textEl = el.createDiv({ cls: 'om-node-text' })
      try {
        renderRichLabel(textEl, text)
      } catch {
        textEl.setText(plainTextOf(text))
      }
      pending.push({ key, text, el })
    }

    // One forced layout for the whole batch. Nothing is read per node before this line.
    void layer.offsetHeight
    for (const item of pending) {
      const width = Math.ceil(item.el.offsetWidth)
      const height = Math.ceil(item.el.offsetHeight)
      richCache.set(
        item.key,
        width > 0 && height > 0
          ? { w: width + 1, h: height + 1 }
          : measureNode(plainTextOf(item.text), font),
      )
    }
    if (richCache.size > RICH_CACHE_LIMIT) richCache.clear()
  } finally {
    layer.remove()
  }
}

/** 布局回调：富节点取预测量结果；纯文本节点或未命中时走原 canvas 路径。 */
export function measureNodeForLayout(text: string, font: FontSpec): Size {
  const rich = richCache.get(richKey(text, font))
  if (rich) return rich
  return measureNode(hasRichLabel(text) ? plainTextOf(text) : text, font)
}

/** 主题切换 / 字号变化时调用。 */
export function clearRichMeasureCache(): void {
  richCache.clear()
}
