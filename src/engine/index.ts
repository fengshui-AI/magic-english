/**
 * 豆语星球 2D 引擎模块
 *
 * 当前状态：PixiJS Graphics 占位渲染（无 Spine 资源）
 * 后续计划：PixiJS + Spine 骨骼动画 + 三轨音频管理
 *
 * 对外接口已预留，迁移时业务代码无需修改。
 */
export { PixiStage } from './PixiStage'
export { SpineLoader, type SpineAssetPaths } from './SpineLoader'
export { AudioManager, audioManager, type AudioTrack } from './AudioManager'

/**
 * 支持的动画名称（与 usePixiDodo 对齐）
 * 当 Spine 资源到位后，这些动画名映射到真实骨骼动画轨道
 */
export const DODO_ANIMATIONS = [
  'idle', 'happy', 'excited', 'eat', 'sleep',
  'sad', 'think', 'surprise', 'wave', 'bounce', 'nod',
] as const

export type DodoAnimation = typeof DODO_ANIMATIONS[number]
