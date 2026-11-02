import { describe, expect, it } from 'vitest'
import { parse } from '../core/parser'
import { serializeNode, serializeTree } from '../core/serializer'
import { insertChild, insertSibling, renameNode } from '../core/tree'
import type { ParseOptions } from '../core/types'
import { allNodes } from './helpers'

const OPTIONS: ParseOptions = { strictLineBreak: false, listNodes: true }

function treeOf(markdown: string) {
  return parse(markdown, OPTIONS)
}

function nodeByText(tree: ReturnType<typeof treeOf>, text: string) {
  const node = allNodes(tree).find(candidate => candidate.text === text)
  if (!node) throw new Error(`没有节点：${text}`)
  return node
}

describe('有序列表作为普通节点', () => {
  it('识别有序列表并保留原始 marker', () => {
    const tree = treeOf('## 根\n1. 甲\n2) 乙\n- 丙\n')
    expect(allNodes(tree).map(node => ({
      text: node.text,
      kind: node.kind,
      depth: node.depth,
      list: node.list,
    }))).toEqual([
      { text: '根', kind: 'heading', depth: 2, list: undefined },
      { text: '甲', kind: 'list', depth: 3, list: { ordered: true, marker: '1.' } },
      { text: '乙', kind: 'list', depth: 3, list: { ordered: true, marker: '2)' } },
      { text: '丙', kind: 'list', depth: 3, list: { ordered: false, marker: '-' } },
    ])
  })

  it('嵌套有序列表仍按缩进形成层级', () => {
    const tree = treeOf('## 根\n1. 父\n    1. 子\n- 兄弟\n')
    const nodes = allNodes(tree)
    expect(nodes.map(node => `${node.depth}:${node.text}`)).toEqual([
      '2:根', '3:父', '4:子', '3:兄弟',
    ])
  })

  it('listNodes 关闭时有序列表仍留在正文，不成为节点', () => {
    const tree = parse('## 根\n1. 甲\n2. 乙\n', { strictLineBreak: false, listNodes: false })
    expect(allNodes(tree).map(node => node.text)).toEqual(['根'])
  })

  it('有序列表超过 9 位数字或缺少空白时不识别', () => {
    const tree = treeOf('## 根\n1234567890. 不是列表\n1.没有空格\n')
    expect(allNodes(tree).map(node => node.text)).toEqual(['根'])
  })

  it('支持两位编号，续行按完整 marker 的内容列判断', () => {
    const tree = treeOf('## 根\n10. 甲\n    续行\n')
    const node = nodeByText(tree, '甲')
    expect(node.list).toEqual({ ordered: true, marker: '10.' })
    expect(tree.lines.slice(node.titleLine + 1, node.bodyEnd)).toEqual(['    续行'])
  })

  it('序列化未修改的有序列表时原样保留 marker', () => {
    const source = '## 根\n1. 甲\n2) 乙\n'
    const tree = treeOf(source)
    expect(serializeTree(tree, OPTIONS).join('\n')).toBe('## 根\n1. 甲\n2) 乙')
  })

  it('重命名有序项仍写回原始 marker', () => {
    const tree = treeOf('## 根\n1. 甲\n2) 乙\n')
    const node = nodeByText(tree, '甲')
    expect(renameNode(tree, node.id, '甲改')[0]?.lines).toEqual(['1. 甲改'])
  })

  it('有序项的新兄弟继承 delimiter，并使用懒编号 1', () => {
    const tree = treeOf('## 根\n1. 甲\n')
    const node = nodeByText(tree, '甲')
    expect(insertSibling(tree, node.id, '新兄弟', 'after', OPTIONS)[0]?.lines).toEqual(['1. 新兄弟'])

    const parenTree = treeOf('## 根\n2) 甲\n')
    const parenNode = nodeByText(parenTree, '甲')
    expect(insertSibling(parenTree, parenNode.id, '新兄弟', 'after', OPTIONS)[0]?.lines).toEqual(['1) 新兄弟'])

    expect(insertChild(tree, node.id, '新子项', 'last', OPTIONS)[0]?.lines).toEqual(['\t- 新子项'])
  })

  it('无序项的新兄弟保留原 marker', () => {
    const tree = treeOf('## 根\n* 甲\n')
    const node = nodeByText(tree, '甲')
    expect(insertSibling(tree, node.id, '新兄弟', 'after', OPTIONS)[0]?.lines).toEqual(['* 新兄弟'])
  })

  it('serializeNode 支持显式传入有序 marker', () => {
    expect(serializeNode('甲', 7, 'list', 7, { ordered: true, marker: '3.' })).toBe('3. 甲')
    expect(serializeNode('甲', 9, 'list', 7, { ordered: true, marker: '3)' })).toBe('\t\t3) 甲')
  })
})
