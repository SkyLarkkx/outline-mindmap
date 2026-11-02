import { describe, expect, it } from 'vitest'
import { hasRichLabel, plainTextOf, renderRichLabel } from '../src/view/richLabel'
import { FakeElement } from './fake-dom'

describe('rich node labels', () => {
  it('renders the user-facing styled span and keeps its safe inline styles', () => {
    const host = new FakeElement()
    const source = '<span style="background-color: #4472C4; color: white; padding: 4px 8px; border-radius: 4px;">微指令的设计</span>'
    expect(hasRichLabel(source)).toBe(true)

    renderRichLabel(host as any, source)
    const span = host.children[0] as FakeElement
    expect(span.tagName).toBe('span')
    expect(span.attributes['style']).toContain('background-color: #4472C4')
    expect(span.attributes['style']).toContain('padding: 4px 8px')
    expect(span.attributes['style']).toContain('border-radius: 4px')
    expect(span.children).toContain('微指令的设计')
  })

  it('strips dangerous styles and event attributes', () => {
    const host = new FakeElement()
    renderRichLabel(
      host as any,
      '<span style="position: fixed; color: red; background-image: url(https://x);" onclick="alert(1)">标题</span>',
    )
    const span = host.children[0] as FakeElement
    expect(span.attributes['style']).toBe('color: red')
    expect(span.attributes['onclick']).toBeUndefined()
  })

  it('still handles Markdown inside the HTML', () => {
    const host = new FakeElement()
    renderRichLabel(host as any, '<span>**重点**和==高亮==</span>')
    const span = host.children[0] as FakeElement
    const tags = span.children.filter((child): child is FakeElement => typeof child !== 'string').map(child => child.tagName)
    expect(tags).toContain('strong')
    expect(tags).toContain('mark')
  })

  it('falls back to plain text for measurement and leaves plain labels alone', () => {
    expect(hasRichLabel('普通 **标题**')).toBe(false)
    expect(plainTextOf('<span>标题</span> &amp; more')).toBe('标题 & more')
  })
})
