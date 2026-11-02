import type { MindNode, MindTree } from '../core/types'
import { parseInline } from './inline'

export interface SearchMatch { content: string; matches: [number, number][] }
export interface SearchState { match: SearchMatch }

/** Obsidian search eState. Copy and validate at the boundary; never retain its mutable arrays. */
export function searchState(value: unknown): SearchState | null {
  if (!value || typeof value !== 'object') return null
  const match = (value as { match?: unknown }).match
  if (!match || typeof match !== 'object') return null
  const { content, matches } = match as { content?: unknown; matches?: unknown }
  if (typeof content !== 'string' || !Array.isArray(matches)) return null
  const ranges: [number, number][] = []
  for (const range of matches) {
    if (!Array.isArray(range) || range.length !== 2) continue
    const [from, to] = range as unknown[]
    if (typeof from === 'number' && typeof to === 'number' && Number.isSafeInteger(from) &&
        Number.isSafeInteger(to) && from >= 0 && to >= from && to <= content.length) ranges.push([from, to])
  }
  return ranges.length ? { match: { content, matches: ranges } } : null
}

export interface SearchTarget { node: MindNode | null; line: number; text: string; body: boolean }

/** Refuse stale offsets. Body text belongs to the deepest preceding visible source node. */
export function searchTargets(tree: MindTree, state: SearchState): SearchTarget[] | null {
  const content = state.match.content
  // Obsidian may normalize CRLF in its search index. Compare lines but use original offsets.
  const lines = content.split(/\r?\n/)
  if (lines.length !== tree.lines.length || lines.some((line, i) => line !== tree.lines[i])) return null
  const starts = [0]
  for (let i = 0; i < content.length; i++) if (content[i] === '\n') starts.push(i + 1)
  const nodes = [...tree.byId.values()].filter(n => n.titleLine >= 0).sort((a, b) => a.titleLine - b.titleLine)
  return state.match.matches.map(([from, to]) => {
    let lo = 0, hi = starts.length
    while (lo + 1 < hi) {
      const mid = (lo + hi) >>> 1
      if (starts[mid]! <= from) lo = mid
      else hi = mid
    }
    const line = lo
    let node: MindNode | null = null
    for (const candidate of nodes) {
      if (candidate.titleLine > line) break
      node = candidate
    }
    return { node, line, text: content.slice(from, to), body: !node || node.titleLine !== line }
  })
}

/** Scoped method interception that composes with other plugins and becomes inert on disposal. */
export function observeEphemeralState<T extends { setEphemeralState(state: unknown): void }>(
  target: T,
  observe: (self: T, state: unknown) => void,
): () => void {
  const original = target.setEphemeralState
  let active = true
  function wrapped(this: T, state: unknown): void {
    original.call(this, state)
    if (active) observe(this, state)
  }
  target.setEphemeralState = wrapped
  return () => {
    active = false
    if (target.setEphemeralState === wrapped) target.setEphemeralState = original
  }
}


/** Strip HTML tags and entities for search; keep this file independent of Obsidian. */
function plainSearchText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
}

/** Node-label text used by the in-map search. Strip Markdown/HTML and math delimiters. */
export function nodeSearchText(raw: string): string {
  return plainSearchText(parseInline(raw).map(segment => segment.text).join(''))
}

export interface NodeSearchEntry {
  node: MindNode
  text: string
  folded: string
}

export function nodeSearchEntry(node: MindNode): NodeSearchEntry {
  const text = nodeSearchText(node.text)
  return { node, text, folded: text.toLocaleLowerCase() }
}

/**
 * All actual-case occurrences of a case-insensitive query in one label.
 * Results are deduplicated by visible text so NodeRenderer can mark every
 * occurrence with its existing term-highlighting path.
 */
export function findNodeSearchTerms(
  text: string,
  folded: string,
  queryLower: string,
): string[] {
  if (!queryLower) return []
  const terms = new Set<string>()
  let at = 0
  while ((at = folded.indexOf(queryLower, at)) >= 0) {
    terms.add(text.slice(at, at + queryLower.length))
    at += Math.max(1, queryLower.length)
  }
  return [...terms].filter(term => term.length > 0)
}
