/**
 * 大图性能模式。这里只放纯逻辑，方便在没有 Obsidian/DOM 的环境里测试。
 */

export type PerformanceMode = 'auto' | 'on' | 'off'

/** 移动端自动启用性能模式的总节点数阈值（包含折叠中的节点）。 */
export const PERFORMANCE_NODE_THRESHOLD = 500

/** 大图首屏聚焦第一个根分支时使用的可读缩放比例。 */
export const PERFORMANCE_READABLE_SCALE = 0.9

/** 视口虚拟化的预渲染边距（屏幕像素）。 */
export const PERFORMANCE_CULL_BUFFER_PX = 240

export function normalizePerformanceMode(raw: unknown): PerformanceMode {
  return raw === 'on' || raw === 'off' || raw === 'auto' ? raw : 'auto'
}

/**
 * @param mode 用户设置：自动 / 强制开启 / 关闭
 * @param isMobile 当前是否为移动端（Obsidian Platform.isMobile）
 * @param nodeCount 整棵树的总节点数，包含折叠中的节点
 */
export function shouldUsePerformanceMode(
  mode: PerformanceMode,
  isMobile: boolean,
  nodeCount: number,
): boolean {
  if (mode === 'on') return true
  if (mode === 'off') return false
  return isMobile && nodeCount > PERFORMANCE_NODE_THRESHOLD
}
