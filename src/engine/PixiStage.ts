import { Application, Container } from 'pixi.js'
import { SpineLoader, type SpineAssetPaths } from './SpineLoader'

/**
 * PixiJS 渲染舞台
 * 负责初始化 PixiJS Application，管理 Spine 豆豆的加载与生命周期
 */
export class PixiStage {
  private app: Application
  private canvas: HTMLCanvasElement
  private spineLoader: SpineLoader | null = null
  private dodoContainer: Container | null = null
  private resizeObserver: ResizeObserver | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.app = new Application()
  }

  /**
   * 初始化 PixiJS 应用
   */
  async init(): Promise<void> {
    await this.app.init({
      canvas: this.canvas,
      resizeTo: this.canvas.parentElement || window,
      backgroundColor: 0xffffff,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    // 响应式 resize
    this.resizeObserver = new ResizeObserver(() => {
      this.app.renderer.resize(
        this.canvas.parentElement?.clientWidth || window.innerWidth,
        this.canvas.parentElement?.clientHeight || window.innerHeight,
      )
    })
    if (this.canvas.parentElement) {
      this.resizeObserver.observe(this.canvas.parentElement)
    }
  }

  /**
   * 加载豆豆 Spine 骨骼动画
   */
  async loadDodo(paths: SpineAssetPaths): Promise<void> {
    this.spineLoader = new SpineLoader(this.app)
    this.dodoContainer = await this.spineLoader.loadSpine(paths)

    if (this.dodoContainer) {
      // 居中放置豆豆
      this.dodoContainer.x = this.app.screen.width / 2
      this.dodoContainer.y = this.app.screen.height / 2

      this.app.stage.addChild(this.dodoContainer)
    }
  }

  /**
   * 播放豆豆动画
   */
  playAnimation(animationName: string, loop = false): void {
    if (this.spineLoader) {
      this.spineLoader.playAnimation(animationName, loop)
    }
  }

  /**
   * 设置豆豆表情（切换皮肤）
   */
  setDodoSkin(skinName: string): void {
    if (this.spineLoader) {
      this.spineLoader.setSkin(skinName)
    }
  }

  /**
   * 销毁舞台，释放资源
   */
  destroy(): void {
    this.resizeObserver?.disconnect()
    this.spineLoader?.destroy()
    this.app.destroy(true, { children: true, texture: true })
  }

  /**
   * 获取 PixiJS Application 实例（用于高级操作）
   */
  getApp(): Application {
    return this.app
  }
}
