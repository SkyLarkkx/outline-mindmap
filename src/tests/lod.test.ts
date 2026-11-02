import { describe, expect, it } from 'vitest'
import {
  DETAIL_ENTER_SCALE,
  DETAIL_EXIT_SCALE,
  FAR_ENTER_SCALE,
  FAR_EXIT_SCALE,
  nextDetailLevel,
} from '../view/lod'

describe('LOD thresholds', () => {
  it('uses hysteresis around the detail boundary', () => {
    expect(nextDetailLevel('detail', DETAIL_EXIT_SCALE - 0.01)).toBe('mid')
    expect(nextDetailLevel('detail', DETAIL_EXIT_SCALE)).toBe('detail')
    expect(nextDetailLevel('mid', DETAIL_ENTER_SCALE - 0.01)).toBe('mid')
    expect(nextDetailLevel('mid', DETAIL_ENTER_SCALE)).toBe('detail')
  })

  it('uses hysteresis around the far boundary and can cross levels', () => {
    expect(nextDetailLevel('mid', FAR_ENTER_SCALE - 0.01)).toBe('far')
    expect(nextDetailLevel('far', FAR_EXIT_SCALE)).toBe('far')
    expect(nextDetailLevel('far', FAR_EXIT_SCALE + 0.01)).toBe('mid')
    expect(nextDetailLevel('detail', 0.2)).toBe('far')
    expect(nextDetailLevel('far', 0.9)).toBe('detail')
  })

  it('keeps the current level for invalid scale', () => {
    expect(nextDetailLevel('mid', 0)).toBe('mid')
    expect(nextDetailLevel('far', Number.NaN)).toBe('far')
  })
})
