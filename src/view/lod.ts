/**
 * 大图分级显示（LOD）。
 *
 * 缩放越小，节点文字和富内容的成本越高。远景只保留 H1–H3 的纯文字，
 * 其余节点显示为空盒子；中间档位保留纯文字但不渲染富 HTML / MathJax。
 * 阈值带滞回，避免在临界点来回抖动。
 */

export type DetailLevel = 'detail' | 'mid' | 'far'

/** 从中间档进入完整档、再从完整档退出的比例。 */
export const DETAIL_ENTER_SCALE = 0.72
export const DETAIL_EXIT_SCALE = 0.6
/** 进入远景、退出远景的比例。 */
export const FAR_ENTER_SCALE = 0.36
export const FAR_EXIT_SCALE = 0.44

export function nextDetailLevel(current: DetailLevel, scale: number): DetailLevel {
  if (!Number.isFinite(scale) || scale <= 0) return current
  if (current === 'detail') {
    if (scale >= DETAIL_EXIT_SCALE) return 'detail'
    return scale < FAR_ENTER_SCALE ? 'far' : 'mid'
  }
  if (current === 'far') {
    if (scale <= FAR_EXIT_SCALE) return 'far'
    return scale >= DETAIL_ENTER_SCALE ? 'detail' : 'mid'
  }
  if (scale >= DETAIL_ENTER_SCALE) return 'detail'
  if (scale < FAR_ENTER_SCALE) return 'far'
  return 'mid'
}
