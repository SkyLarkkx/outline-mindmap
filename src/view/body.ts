/**
 * 取一个节点「自己的正文」——标题 / 列表项下面、第一个子节点之前的那一段。
 *
 * 预览只读这一个范围：子标题属于子节点，不能把整棵子树都塞进父节点的预览里。
 * 这里只做纯字符串处理，不 import Obsidian，方便单测。
 */

import type { MindNode, MindTree } from '../core/types'

/** 与 parser.ts 的 A.3 一致：一个 Tab 按 4 列算。 */
const TAB_WIDTH = 4

export interface NodeBody {
  /** 去掉首尾空行、正文公共缩进也已经归一后的 Markdown。 */
  markdown: string
  /** 0-based，包含。 */
  fromLine: number
  /** 0-based，不包含。 */
  toLine: number
}

function indentColumns(ws: string): number {
  let width = 0
  for (const ch of ws) width += ch === '\t' ? TAB_WIDTH : 1
  return width
}

function leadingWhitespace(line: string): string {
  return /^[ \t]*/.exec(line)?.[0] ?? ''
}

/** 去掉最多 `columns` 列前导空白；为了兼容用 Tab 对齐的笔记，Tab 允许越过后继续前进。 */
function dedent(line: string, columns: number): string {
  if (columns <= 0 || line.trim() === '') return line
  let width = 0
  let index = 0
  while (index < line.length && width < columns) {
    const ch = line[index]
    if (ch === ' ') {
      width++
      index++
      continue
    }
    if (ch === '\t') {
      width += TAB_WIDTH
      index++
      continue
    }
    break
  }
  return line.slice(index)
}

function isBlank(line: string): boolean {
  return line.trim() === ''
}

/** 所有非空正文行的公共缩进。 */
function commonIndent(lines: readonly string[]): number {
  let min = Infinity
  for (const line of lines) {
    if (isBlank(line)) continue
    min = Math.min(min, indentColumns(leadingWhitespace(line)))
  }
  return Number.isFinite(min) ? min : 0
}

const TABLE_TAG = /^<\/?(?:table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col)\b/i

/** 表格行再单独去掉前导空白：四空格缩进会被 Markdown 当成代码块。 */
function normalizeTableIndent(line: string): string {
  const trimmed = line.trimStart()
  return trimmed.startsWith('|') || TABLE_TAG.test(trimmed) ? trimmed : line
}

/**
 * @returns 没有正文时返回 null。
 *
 * 正文常常为了视觉层级用 Tab / 空格整体缩进，而四空格起头在 Markdown 里会变成代码块，
 * 表格和 HTML 表格因此会“消失”。预览里按所有非空行的公共缩进整体左移，
 * 既保留相对缩进，又能让表格恢复正常渲染。原始笔记不改，只影响预览字符串。
 */
export function nodeBody(tree: MindTree, node: MindNode): NodeBody | null {
  if (node.titleLine < 0 || node.bodyEnd <= node.titleLine + 1) return null
  const raw = tree.lines.slice(node.titleLine + 1, node.bodyEnd)
  let start = 0
  let end = raw.length
  while (start < end && isBlank(raw[start] ?? '')) start++
  while (end > start && isBlank(raw[end - 1] ?? '')) end--
  if (start >= end) return null

  const content = raw.slice(start, end)
  const common = commonIndent(content)
  const lines = (common > 0
    ? content.map((line) => dedent(line, Math.min(common, indentColumns(leadingWhitespace(line)))))
    : content
  ).map(normalizeTableIndent)

  return {
    markdown: lines.join('\n'),
    fromLine: node.titleLine + 1 + start,
    toLine: node.titleLine + 1 + end,
  }
}
