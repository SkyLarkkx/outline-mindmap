/**
 * 节点标题里的「安全内联 HTML」。
 *
 * 节点不是完整的 Markdown 阅读视图，尺寸又要先于布局算出来，所以这里只接受一组
 * 内联标签和一个受限的 CSS 属性白名单。它足以支持 Obsidian 笔记里常见的
 * `<span style="color/background/padding/border-radius">` 标题，而不会把
 * `<script>`、事件属性、iframe 或任意块级排版带进节点布局。
 *
 * 渲染全部通过 createEl / appendText 完成，不拼 innerHTML。
 */

import { renderMath } from 'obsidian'
import { parseInline, tagsFor } from './inline'

const ALLOWED_TAGS = new Set([
  'span', 'font', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
  'mark', 'small', 'big', 'sup', 'sub', 'br', 'code', 'kbd', 'samp',
  'var', 'abbr', 'q', 'cite', 'ruby', 'rt', 'rp',
])

const VOID_TAGS = new Set(['br'])

/** 允许影响节点内观感、但不改变定位/层叠上下文的 CSS 属性。 */
const ALLOWED_STYLE = new Set([
  'color', 'background', 'background-color',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-color', 'border-style', 'border-width', 'border-radius',
  'font-size', 'font-weight', 'font-style', 'font-family',
  'line-height', 'text-decoration', 'text-shadow', 'letter-spacing',
  'vertical-align', 'opacity',
])

interface TagToken {
  name: string
  attrs: string
  closing: boolean
  selfClosing: boolean
  end: number
}

interface Attribute {
  name: string
  value: string
}

/**
 * 从 `<` 开始读一个标签。结束位置按引号内的 `>` 不算结束来扫描，
 * 因此 `style="a > b"` 不会把标签截断。
 */
function tagAt(text: string, start: number): TagToken | null {
  if (text[start] !== '<') return null
  let quote: string | null = null
  let i = start + 1
  for (; i < text.length; i++) {
    const ch = text[i] as string
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '>') break
  }
  if (i >= text.length) return null

  let inner = text.slice(start + 1, i).trim()
  if (inner === '' || inner.startsWith('!') || inner.startsWith('?')) return null
  const closing = inner.startsWith('/')
  if (closing) inner = inner.slice(1).trim()
  const selfClosing = inner.endsWith('/')
  if (selfClosing) inner = inner.slice(0, -1).trim()
  const match = /^([a-zA-Z][\w:-]*)([\s\S]*)$/.exec(inner)
  if (!match) return null
  return {
    name: (match[1] ?? '').toLowerCase(),
    attrs: (match[2] ?? '').trim(),
    closing,
    selfClosing,
    end: i + 1,
  }
}

function hasTag(text: string): boolean {
  let from = 0
  while (from < text.length) {
    const at = text.indexOf('<', from)
    if (at < 0) return false
    const tag = tagAt(text, at)
    if (tag && ALLOWED_TAGS.has(tag.name)) return true
    from = at + 1
  }
  return false
}

/** 节点是否应该走富文本路径。普通节点继续使用 canvas 测量。 */
export function hasRichLabel(text: string): boolean {
  return hasTag(text)
}

function parseAttributes(raw: string): Attribute[] {
  const attrs: Attribute[] = []
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g
  for (const match of raw.matchAll(re)) {
    const name = (match[1] ?? '').toLowerCase()
    if (!name) continue
    attrs.push({ name, value: match[2] ?? match[3] ?? match[4] ?? '' })
  }
  return attrs
}

/** 只保留安全的内联样式。`url()`、`expression()` 和 `javascript:` 一律丢弃。 */
function safeStyle(raw: string): string {
  const out: string[] = []
  for (const declaration of raw.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon < 0) continue
    const property = declaration.slice(0, colon).trim().toLowerCase()
    const value = declaration.slice(colon + 1).trim()
    if (!ALLOWED_STYLE.has(property) || value === '') continue
    if (/\burl\s*\(|expression\s*\(|javascript:|@import|image-set\s*\(/i.test(value)) continue
    out.push(`${property}: ${value}`)
  }
  return out.join('; ')
}

function applyAttributes(el: HTMLElement, tagName: string, raw: string): void {
  for (const attr of parseAttributes(raw)) {
    if (attr.name === 'style') {
      const style = safeStyle(attr.value)
      if (style !== '') el.setAttribute('style', style)
      continue
    }
    if (attr.name === 'title') {
      el.setAttribute('title', attr.value)
      continue
    }
    // 旧式 <font color> 在笔记里偶尔还会出现，保留它的颜色语义。
    if (tagName === 'font' && attr.name === 'color') {
      el.setAttribute('color', attr.value)
    }
  }
}

/** 把 Markdown 片段塞进当前 HTML 父节点；返回是否渲染了行内公式。 */
function appendInline(parent: HTMLElement, text: string): boolean {
  let renderedMath = false
  for (const seg of parseInline(text)) {
    let target = parent
    for (const { tag, cls } of tagsFor(seg).reverse()) {
      target = target.createEl(tag, cls ? { cls } : undefined)
    }
    if (seg.math) {
      try {
        const math = renderMath(seg.text, false)
        math.addClass('om-math')
        target.appendChild(math)
        renderedMath = true
      } catch {
        target.appendText(`$${seg.text}$`)
      }
    } else {
      target.appendText(seg.text)
    }
  }
  return renderedMath
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged.at(-1)
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([...range])
  }
  return merged
}

/** 在已经建好的富文本 DOM 上做搜索高亮；跨 HTML 标签也能覆盖到文本节点。 */
function highlightTextNodes(root: HTMLElement, terms: readonly string[]): void {
  const needles = [...new Set(terms.filter(Boolean))]
  if (needles.length === 0) return
  const doc = root.ownerDocument
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */)
  const nodes: Text[] = []
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    if (!node.nodeValue) continue
    const parent = node.parentElement
    if (parent?.closest('.om-math, mjx-container')) continue
    nodes.push(node)
  }

  for (const node of nodes) {
    const value = node.nodeValue ?? ''
    const ranges: [number, number][] = []
    for (const needle of needles) {
      let from = 0
      let at: number
      while ((at = value.indexOf(needle, from)) >= 0) {
        ranges.push([at, at + needle.length])
        from = at + needle.length
      }
    }
    if (ranges.length === 0) continue

    const fragment = doc.createDocumentFragment()
    let cursor = 0
    for (const [from, to] of mergeRanges(ranges)) {
      if (from > cursor) fragment.append(value.slice(cursor, from))
      const mark = doc.createElement('mark')
      mark.className = 'om-search-match'
      mark.textContent = value.slice(from, to)
      fragment.append(mark)
      cursor = to
    }
    if (cursor < value.length) fragment.append(value.slice(cursor))
    node.parentNode?.replaceChild(fragment, node)
  }
}

export interface RichRenderResult {
  renderedMath: boolean
}

/**
 * 把含 HTML 的节点文字渲染进 host。未闭合、错配或不在白名单里的标签会按普通文字
 * 或忽略处理；不会因为一段坏 HTML 让整个节点空白。
 */
export function renderRichLabel(
  host: HTMLElement,
  text: string,
  terms: readonly string[] = [],
): RichRenderResult {
  host.empty()
  const stack: { name: string; el: HTMLElement }[] = []
  let parent: HTMLElement = host
  let renderedMath = false
  let i = 0

  while (i < text.length) {
    const at = text.indexOf('<', i)
    if (at < 0) {
      if (appendInline(parent, text.slice(i))) renderedMath = true
      break
    }
    if (at > i && appendInline(parent, text.slice(i, at))) renderedMath = true

    const tag = tagAt(text, at)
    if (!tag || !ALLOWED_TAGS.has(tag.name)) {
      parent.appendText('<')
      i = at + 1
      continue
    }

    if (tag.closing) {
      const index = stack.map(item => item.name).lastIndexOf(tag.name)
      if (index >= 0) {
        stack.length = index
        parent = index > 0 ? (stack[index - 1] as { el: HTMLElement }).el : host
      }
      i = tag.end
      continue
    }

    if (VOID_TAGS.has(tag.name)) {
      parent.createEl('br')
      i = tag.end
      continue
    }

    const el = parent.createEl(tag.name as keyof HTMLElementTagNameMap)
    applyAttributes(el, tag.name, tag.attrs)
    if (!tag.selfClosing) {
      stack.push({ name: tag.name, el })
      parent = el
    }
    i = tag.end
  }

  if (terms.length > 0) highlightTextNodes(host, terms)
  return { renderedMath }
}

/** 给纯文本测量用的兜底：去掉标签，避免把标签字符算进宽度。 */
export function plainTextOf(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
}
