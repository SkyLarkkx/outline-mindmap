import { describe, expect, it } from 'vitest'
import { parse } from '../core/parser'
import type { ParseOptions } from '../core/types'
import { collectPreviewableIds, hasNodeBody, nodeBody } from '../view/body'
import { allNodes } from './helpers'

const OPTIONS: ParseOptions = { strictLineBreak: false, listNodes: true }

function bodyOf(markdown: string, index = 0): ReturnType<typeof nodeBody> {
  const tree = parse(markdown, OPTIONS)
  const node = allNodes(tree)[index]
  if (!node) throw new Error(`没有第 ${index} 个节点`)
  return nodeBody(tree, node)
}

describe('节点正文预览范围', () => {
  it('只取标题自己的正文，不包含子标题和子标题正文', () => {
    const body = bodyOf('# 根\n\n第一段\n\n## 子\n子正文\n')
    expect(body).toEqual({ markdown: '第一段', fromLine: 2, toLine: 3 })
  })

  it('保留正文里的 HTML、图片嵌入和行内公式原样交给 MarkdownRenderer', () => {
    const body = bodyOf('# 根\n\n<div class="x">HTML</div>\n![[图.png]]\n\n公式 $a^2$\n')
    expect(body?.markdown).toBe('<div class="x">HTML</div>\n![[图.png]]\n\n公式 $a^2$')
  })

  it('去掉首尾空行，但保留正文内部的空行', () => {
    const body = bodyOf('# 根\n\n\n甲\n\n乙\n\n\n## 子\n')
    expect(body?.markdown).toBe('甲\n\n乙')
    expect(body?.fromLine).toBe(3)
    expect(body?.toLine).toBe(6)
  })

  it('没有正文时返回 null', () => {
    expect(bodyOf('# 根\n\n## 子\n')).toBeNull()
    expect(bodyOf('# 根\n')).toBeNull()
  })

  it('列表项的缩进续行按公共缩进归一，避免被当成代码块', () => {
    const body = bodyOf('## 根\n- 列表项\n    续行 **粗体**\n    ![[图.png]]\n- 兄弟\n', 1)
    expect(body?.markdown).toBe('续行 **粗体**\n![[图.png]]')
    expect(body?.fromLine).toBe(2)
    expect(body?.toLine).toBe(4)
  })

  it('深层列表项按公共缩进归一', () => {
    const body = bodyOf('## 根\n    - 列表项\n        续行\n', 1)
    expect(body?.markdown).toBe('续行')
  })

  it('Tab 缩进的 Markdown 表格会去掉公共缩进，交给 MarkdownRenderer 正常解析', () => {
    const body = bodyOf('## 根\n- 列表项\n\t| 甲 | 乙 |\n\t| --- | --- |\n\t| 1 | 2 |\n', 1)
    expect(body?.markdown).toBe('| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |')
  })

  it('区分有正文和只有子节点的节点，并一次性收集可预览 id', () => {
    const tree = parse(['# 根', '', '根正文', '', '## 有正文', '', '子正文', '', '## 没正文', '### 孙', '', '孙正文', ''].join(String.fromCharCode(10)), OPTIONS)
    const root = allNodes(tree)[0]!
    const withBody = allNodes(tree)[1]!
    const withoutBody = allNodes(tree)[2]!
    expect(hasNodeBody(tree, root)).toBe(true)
    expect(hasNodeBody(tree, withBody)).toBe(true)
    expect(hasNodeBody(tree, withoutBody)).toBe(false)
    expect(collectPreviewableIds(tree)).toEqual(new Set([root.id, withBody.id, allNodes(tree)[3]!.id]))
  })

  it('Tab 缩进的 HTML 表格同样恢复正常渲染', () => {
    const body = bodyOf('## 根\n- 列表项\n\t<table><tr><td>甲</td></tr></table>\n', 1)
    expect(body?.markdown).toBe('<table><tr><td>甲</td></tr></table>')
  })

  it('即使表格块保留额外缩进，也会单独去掉表格行的前导空白', () => {
    const body = bodyOf('## 根\n- 列表项\n    段落\n        | 甲 | 乙 |\n        | --- | --- |\n', 1)
    expect(body?.markdown).toBe('段落\n| 甲 | 乙 |\n| --- | --- |')
  })
})
