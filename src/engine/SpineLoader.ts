import { Application, Container, Assets } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi'

/**
 * Spine 资源路径配置
 */
export interface SpineAssetPaths {
  /** .json 骨骼文件（PixiJS Assets 注册的 key） */
  skeleton: string
  /** .atlas 图集文件（PixiJS Assets 注册的 key） */
  atlas: string
}

/**
 * Spine 骨骼动画加载器
 * 封装 @esotericsoftware/spine-pixi 的加载、播放、切换逻辑
 */
export class SpineLoader {
  private app: Application
  private spine: Spine | null = null

  constructor(app: Application) {
    this.app = app
  }

  /**
   * 加载 Spine 骨骼资源并返回 Container
   * 需要先通过 Assets.load() 预加载资源
   */
  async loadSpine(paths: SpineAssetPaths): Promise<Container> {
    // 确保资源已加载
    await Assets.load([paths.skeleton, paths.atlas])

    // 创建 Spine 实例
    // Spine.from 接受 asset key 名称
    this.spine = Spine.from(paths.skeleton, paths.atlas, { scale: 0.5 })

    // 默认播放 idle 动画（如果存在）
    try {
      this.spine.state.setAnimation(0, 'idle', true)
    } catch {
      // 没有 idle 动画时忽略
    }

    return this.spine as unknown as Container
  }

  /**
   * 播放指定动画
   * @param name 动画名称（如 idle, happy, sad, wave）
   * @param loop 是否循环播放
   */
  playAnimation(name: string, loop = false): void {
    if (!this.spine) return
    try {
      this.spine.state.setAnimation(0, name, loop)
    } catch {
      console.warn(`[SpineLoader] Animation "${name}" not found, falling back to idle`)
      try {
        this.spine.state.setAnimation(0, 'idle', true)
      } catch {
        // 没有 idle 动画时忽略
      }
    }
  }

  /**
   * 切换皮肤（用于表情/出生地差异）
   */
  setSkin(skinName: string): void {
    if (!this.spine) return
    try {
      const skin = this.spine.skeleton.data.findSkin(skinName)
      if (skin) {
        this.spine.skeleton.setSkin(skin)
        this.spine.skeleton.setToSetupPose()
      }
    } catch {
      console.warn(`[SpineLoader] Skin "${skinName}" not found`)
    }
  }

  /**
   * 释放 Spine 资源
   */
  destroy(): void {
    this.spine?.destroy()
    this.spine = null
  }
}
