/**
 * 界面文案。中英双语，跟随 Obsidian 的界面语言（`moment.locale()`）。
 *
 * - `zh` 表用 `as const` 定型，key 集即类型；`en` 表被类型强制逐 key 对齐——
 *   漏译一条编译不过，两边永远不会悄悄漂移。
 * - 只服务 UI 层（main / view / settings）。core 与 doc 抛的错误信息【不】走这里：
 *   本文件 import obsidian，core 的零依赖铁律优先，且那些错误深植于已测透的代码。
 * - `{0}`、`{1}` … 由 `t()` 的参数依次替换。
 */

import { moment } from 'obsidian'

const zh = {
  // ── 入口与命令（main.ts）──
  'ribbon.open': '在侧边栏打开大纲思维导图',
  'menu.openAsMindmap': '打开为导图',
  'menu.openAsNote': '打开为笔记',
  'menu.undo': '撤销',
  'menu.redo': '重做',
  'command.open': '打开导图',
  'command.openInSidebar': '在侧边栏打开导图',
  'command.perfReport': '性能自检',
  'command.followReport': '跟随自检',
  'notice.openMindmapFirst': '请先打开大纲思维导图。',
  'notice.cannotUndo': '没有可撤销的导图操作。',
  'notice.cannotRedo': '没有可重做的导图操作。',
  'notice.historyConflict': '笔记已在别处修改，旧的导图撤销记录已清除，未覆盖当前内容。',
  'notice.searchStale': '笔记内容已变化，请重新搜索以定位准确位置。',
  'search.matches': '搜索匹配：{0} 处',
  'search.body': '搜索匹配：{0} 处（含正文，可查看原文）',
  'search.openNote': '查看原文',
  'search.clear': '清除高亮',
  'notice.operationAborted': '导图操作未完成：{0}',
  'notice.listNodesRequired': '列表项已被忽略，目标位置的层级会超过标题的 6 层上限。',
  'notice.copiedToClipboard': '（已复制到剪贴板）',

  // ── 视图（MindmapView）──
  'view.title': '大纲思维导图',
  'view.titleWithNote': '导图：{0}',
  'view.empty': '当前没有可显示的笔记',

  // ── 正文预览（BodyPreview）──
  'preview.title': '节点正文预览',
  'preview.untitled': '（未命名节点）',
  'preview.meta': '正文 · 第 {0}–{1} 行',
  'preview.loading': '正在渲染正文…',
  'preview.error': '正文渲染失败，下面显示 Markdown 源码。',
  'preview.pin': '固定到侧栏',
  'preview.close': '关闭正文预览',
  'preview.resize': '拖动调整预览大小',
  'preview.noSelection': '请先选中一个节点。',
  'preview.noBody': '这个节点没有正文。',

  // ── 跟随自检（MindmapView.diagnostics）──
  'diag.title': '导图跟随自检（{0}，本实例已存活 {1}s）',
  'diag.mainArea': '主页面区',
  'diag.sidebar': '侧边栏',
  'diag.activeNote': '· Obsidian 的活动笔记：{0}',
  'diag.showing': '· 导图正在显示：{0}',
  'diag.treeEmpty': '（树是空的）',
  'diag.none': '（无）',
  'diag.switches': '· 固定显示一篇笔记：{0}／单击即跳转：{1}',
  'diag.pinned': '· 本视图钉在一篇上（「打开为导图」换出来的）：{0}',
  'diag.on': '开',
  'diag.off': '关',
  'diag.trail': '· 同步留痕（最近 {0} 次，早 → 晚）：',
  'diag.noEvents': '    （一次都没有——事件根本没送到这个视图）',
  'trail.switched': '切到 {0}',
  'trail.blockedByPin': '被「固定显示一篇笔记」挡下',
  'trail.noActive': '此刻没有活动笔记，保持原样',
  'trail.sameNote': '与正在显示的是同一篇，无需切换',

  // ── 性能自检（MindmapView.perfReport）──
  'perf.noNote': '导图性能自检：当前没有可显示的笔记。',
  'perf.title': '导图性能自检（{0} 个可见节点）',
  'perf.layout': '· 布局：{0}',
  'perf.cold': '· 首次渲染：{0}（建全部 DOM + 样式与排版）',
  'perf.warm': '· 重绘：{0}（复用现有 DOM）',
  'perf.needsVirtualize': '首次渲染超过 500ms，按手册 M10 需要引入视口虚拟化。',
  'perf.ok': '首次渲染在 500ms 以内。',

  // ── 工具栏（Toolbar）──
  'tool.fit': '适应画布',
  'tool.zoomOut': '缩小',
  'tool.zoomIn': '放大',
  'tool.layout': '布局',
  'tool.lock': '锁定导图（仅预览）',
  'tool.unlock': '解锁导图（允许编辑）',
  'tool.readingLock': '笔记处于阅读模式，导图已强制锁定',
  'tool.expand': '展开全部',
  'tool.collapse': '折叠全部',
  'tool.preview': '预览节点正文',
  'tool.previewClose': '关闭正文预览',
  'tool.style': '样式设置',
  'direction.right': '分支向右',
  'direction.left': '分支向左',
  'direction.both': '分支两侧',

  // ── 样式窗口（StyleModal）──
  'style.title': '导图样式',
  'style.titleWithNote': '导图样式：{0}',
  'style.applyGlobal': '应用全局设置',
  'style.applyFile': '应用单篇笔记设置',
  'style.cancel': '取消',
  'style.noNote': '当前没有打开的笔记',
  'style.hGap': '主题间距 · 横向',
  'style.hGapDesc': '父节点与子节点之间的水平距离。',
  'style.vGap': '主题间距 · 纵向',
  'style.vGapDesc': '相邻分支之间的垂直距离。',
  'style.shape': '节点形状',
  'style.branch': '分支样式',
  'style.scheme': '配色方案',
  'style.fontScale': '字号缩放',
  'style.fontScaleDesc': '1.0 表示跟随主题字号。',
  'style.levelColors': '按层级着色',
  'style.levelColorsDesc': '不同层级的节点用不同的颜色显示文字与边框。',
  'style.bodyMarks': '标记可预览节点',
  'style.bodyMarksDesc': '在有直接正文的节点右下角显示小眼睛；细节档和中间档显示，远景轻量全景隐藏。',
  'shape.rounded': '圆角矩形',
  'shape.pill': '胶囊',
  'shape.underline': '下划线',
  'branch.straight': '直线',
  'branch.curve': '斜线',
  'branch.elbow': '折线',
  'scheme.theme': '跟随主题',
  'scheme.blue': '蓝',
  'scheme.green': '绿',
  'scheme.warm': '暖',

  // ── 设置页（SettingsTab）──
  'settings.clickToJump': '单击即跳转',
  'settings.clickToJumpDesc':
    '单击导图节点时，把笔记滚动到对应标题并高亮。只滚屏幕上已经开着的笔记，' +
    '不会替你新开标签页；笔记没开着（比如用「打开为导图」进来的）时单击只选中节点。',
  'settings.hoverPreview': '悬停预览正文',
  'settings.hoverPreviewDesc':
    '鼠标在节点上停留片刻后，用 Obsidian 的阅读视图渲染该节点标题下的正文；' +
    'HTML、图片、公式和内嵌内容都按阅读视图处理。工具栏的眼睛按钮可以打开固定的侧栏预览。',
  'settings.lockFile': '固定显示一篇笔记',
  'settings.lockFileDesc': '开启后导图不再跟着你切换笔记，一直停在打开它时的那一篇。',
  'settings.gracefulAnimation': '优雅动画',
  'settings.gracefulAnimationDesc': '默认开启，节点与连线同步平滑移动。超过 250 个可见节点或系统启用减少动态效果时不播放动画。',
  'settings.strictLineBreak': '严格换行',
  'settings.strictLineBreakDesc': '新增或移动节点时，在相邻的两个标题之间补足 3 个空行。关闭后只写必要的那一行。',
  'settings.listNodes': '把列表项显示为节点',
  'settings.listNodesDesc':
    '开启后，标题下的列表项作为更深层的导图节点（第 7 层起）。' +
    '关闭后列表只算正文，导图仅由标题构成。',
  'settings.performanceMode': '大图性能模式',
  'settings.performanceModeDesc':
    '自动：移动端总节点超过 500、桌面端超过 800 时启用；' +
    '开启：始终只渲染视口附近的节点、使用可读局部首屏并按缩放简化远景；关闭：始终完整渲染。',
  'settings.performanceModeAuto': '自动（移动端 > 500 / 桌面端 > 800）',
  'settings.performanceModeOn': '始终开启',
  'settings.performanceModeOff': '关闭',
  'settings.rememberOpenAs': '记住每篇笔记的打开方式',
  'settings.rememberOpenAsDesc':
    '用「打开为导图」转换过的笔记，下次打开时直接显示为导图；「打开为笔记」即恢复。' +
    '记录只存在插件自己的 data.json 里，笔记本身一个字节都不变。',
} as const

export type MsgKey = keyof typeof zh

const en: Record<MsgKey, string> = {
  // ── Entry & commands (main.ts) ──
  'ribbon.open': 'Open outline mindmap in sidebar',
  'menu.openAsMindmap': 'Open as mindmap',
  'menu.openAsNote': 'Open as note',
  'menu.undo': 'Undo',
  'menu.redo': 'Redo',
  'command.open': 'Open mindmap',
  'command.openInSidebar': 'Open mindmap in sidebar',
  'command.perfReport': 'Performance report',
  'command.followReport': 'Follow report',
  'notice.openMindmapFirst': 'Open a mindmap view first.',
  'notice.cannotUndo': 'No mindmap action to undo.',
  'notice.cannotRedo': 'No mindmap action to redo.',
  'notice.historyConflict': 'The note changed elsewhere. Old mindmap history was cleared; current content was not overwritten.',
  'notice.searchStale': 'The note has changed. Search again to locate the current text.',
  'search.matches': 'Search matches: {0}',
  'search.body': 'Search matches: {0} (includes body text; view in note for details)',
  'search.openNote': 'View in note',
  'search.clear': 'Clear highlights',
  'notice.operationAborted': 'Mindmap action not completed: {0}',
  'notice.listNodesRequired':
    'List items are ignored, so the target position would exceed the 6-level heading limit.',
  'notice.copiedToClipboard': '(copied to clipboard)',

  // ── View (MindmapView) ──
  'view.title': 'Outline mindmap',
  'view.titleWithNote': 'Mindmap: {0}',
  'view.empty': 'No note to display',

  // ── Body preview (BodyPreview) ──
  'preview.title': 'Node body preview',
  'preview.untitled': '(Untitled node)',
  'preview.meta': 'Body · lines {0}–{1}',
  'preview.loading': 'Rendering body…',
  'preview.error': 'Failed to render the body; showing its Markdown source instead.',
  'preview.pin': 'Pin to side panel',
  'preview.close': 'Close body preview',
  'preview.resize': 'Drag to resize the preview',
  'preview.noSelection': 'Select a node first.',
  'preview.noBody': 'This node has no body text.',

  // ── Follow diagnostics (MindmapView.diagnostics) ──
  'diag.title': 'Mindmap follow diagnostics ({0}, instance alive for {1}s)',
  'diag.mainArea': 'main area',
  'diag.sidebar': 'sidebar',
  'diag.activeNote': '· Obsidian active note: {0}',
  'diag.showing': '· Mindmap is showing: {0}',
  'diag.treeEmpty': ' (tree is empty)',
  'diag.none': '(none)',
  'diag.switches': '· Pin to one note: {0} / Click to jump: {1}',
  'diag.pinned': '· This view is pinned to its note (converted with "Open as mindmap"): {0}',
  'diag.on': 'on',
  'diag.off': 'off',
  'diag.trail': '· Sync trail (last {0}, early → late):',
  'diag.noEvents': '    (none at all — no event ever reached this view)',
  'trail.switched': 'switched to {0}',
  'trail.blockedByPin': 'blocked by "pin to one note"',
  'trail.noActive': 'no active note at this moment, kept as is',
  'trail.sameNote': 'same note already shown, no switch needed',

  // ── Performance report (MindmapView.perfReport) ──
  'perf.noNote': 'Performance report: no note to display.',
  'perf.title': 'Performance report ({0} visible nodes)',
  'perf.layout': '· Layout: {0}',
  'perf.cold': '· First render: {0} (build all DOM + style & layout)',
  'perf.warm': '· Repaint: {0} (reusing existing DOM)',
  'perf.needsVirtualize': 'First render exceeds 500ms; viewport virtualization is required.',
  'perf.ok': 'First render is within 500ms.',

  // ── Toolbar ──
  'tool.fit': 'Fit to canvas',
  'tool.zoomOut': 'Zoom out',
  'tool.zoomIn': 'Zoom in',
  'tool.layout': 'Layout',
  'tool.lock': 'Lock mindmap (preview only)',
  'tool.unlock': 'Unlock mindmap (allow editing)',
  'tool.readingLock': 'Mindmap is locked while the note is in Reading view',
  'tool.expand': 'Expand all',
  'tool.collapse': 'Collapse all',
  'tool.preview': 'Preview node body',
  'tool.previewClose': 'Close body preview',
  'tool.style': 'Style settings',
  'direction.right': 'Branches right',
  'direction.left': 'Branches left',
  'direction.both': 'Both sides',

  // ── Style modal (StyleModal) ──
  'style.title': 'Mindmap style',
  'style.titleWithNote': 'Mindmap style: {0}',
  'style.applyGlobal': 'Apply as global style',
  'style.applyFile': 'Apply to this note',
  'style.cancel': 'Cancel',
  'style.noNote': 'No note is open',
  'style.hGap': 'Spacing · horizontal',
  'style.hGapDesc': 'Horizontal distance between a parent and its children.',
  'style.vGap': 'Spacing · vertical',
  'style.vGapDesc': 'Vertical distance between sibling branches.',
  'style.shape': 'Node shape',
  'style.branch': 'Branch style',
  'style.scheme': 'Color scheme',
  'style.fontScale': 'Font scale',
  'style.fontScaleDesc': '1.0 follows the theme font size.',
  'style.levelColors': 'Color by level',
  'style.levelColorsDesc': 'Show node text and border in a color that depends on the level.',
  'style.bodyMarks': 'Mark previewable nodes',
  'style.bodyMarksDesc': 'Show a small eye on nodes with direct body text. Visible in detail and middle zoom levels; hidden in the far lightweight panorama.',
  'shape.rounded': 'Rounded rectangle',
  'shape.pill': 'Pill',
  'shape.underline': 'Underline',
  'branch.straight': 'Straight',
  'branch.curve': 'Curve',
  'branch.elbow': 'Elbow',
  'scheme.theme': 'Follow theme',
  'scheme.blue': 'Blue',
  'scheme.green': 'Green',
  'scheme.warm': 'Warm',

  // ── Settings (SettingsTab) ──
  'settings.clickToJump': 'Click to jump',
  'settings.clickToJumpDesc':
    'Clicking a node scrolls the note to the matching heading and highlights it. ' +
    'Only notes already on screen are scrolled — no new tabs are opened. ' +
    'When the note is not open (e.g. after "Open as mindmap"), clicking only selects the node.',
  'settings.hoverPreview': 'Hover preview',
  'settings.hoverPreviewDesc':
    'After resting on a node, render the body beneath its heading with Obsidian’s reading view, ' +
    'including HTML, images, math and embeds. The eye button in the toolbar opens a pinned side preview.',
  'settings.lockFile': 'Pin to one note',
  'settings.lockFileDesc': 'The mindmap stops following note switches and stays on the note it was opened with.',
  'settings.gracefulAnimation': 'Graceful animation',
  'settings.gracefulAnimationDesc': 'On by default. Animate nodes and edges together. Motion is disabled above 250 visible nodes or when the system requests reduced motion.',
  'settings.strictLineBreak': 'Strict line breaks',
  'settings.strictLineBreakDesc': 'When adding or moving nodes, pad to exactly 3 blank lines between adjacent headings. When off, only the necessary line is written.',
  'settings.listNodes': 'Show list items as nodes',
  'settings.listNodesDesc':
    'When on, list items under headings become deeper mindmap nodes (level 7 and beyond). ' +
    'When off, lists count as body text and the map is built from headings only.',
  'settings.performanceMode': 'Large-map performance mode',
  'settings.performanceModeDesc':
    'Auto: enabled on mobile above 500 nodes and on desktop above 800 nodes. ' +
    'On: only render nodes near the viewport, start with a readable local view and simplify far zoom levels. Off: always render the whole map.',
  'settings.performanceModeAuto': 'Auto (mobile > 500 / desktop > 800)',
  'settings.performanceModeOn': 'Always on',
  'settings.performanceModeOff': 'Off',
  'settings.rememberOpenAs': 'Remember how each note opens',
  'settings.rememberOpenAsDesc':
    'A note converted with "Open as mindmap" opens as a mindmap next time; "Open as note" restores it. ' +
    "The record lives only in the plugin's data.json — the note itself is never touched.",
}

/** 当前语言该用的那张表。zh-* 一律归中文，其余归英文。 */
function table(): Record<MsgKey, string> {
  return moment.locale().startsWith('zh') ? zh : en
}

/** 取一条界面文案。`{0}`、`{1}` … 会被参数依次替换。 */
export function t(key: MsgKey, ...args: (string | number)[]): string {
  let s = table()[key]
  for (let i = 0; i < args.length; i++) {
    s = s.replaceAll(`{${i}}`, String(args[i]))
  }
  return s
}
