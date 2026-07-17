import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { Application, Graphics, Container, Ticker } from 'pixi.js'

/**
 * PixiJS 豆豆渲染 composable
 * 管理 PixiJS Application 的完整生命周期
 * 无 Spine 资源时显示占位粒子效果（呼吸光晕 + 浮动豆豆）
 */
export function usePixiDodo(canvasRef: Ref<HTMLCanvasElement | null>) {
  const app = ref<Application | null>(null)
  const ready = ref(false)
  const dodoContainer = ref<Container | null>(null)

  let breathTicker: Ticker | null = null
  let floatTicker: Ticker | null = null
  let particleTicker: Ticker | null = null

  /**
   * 初始化 PixiJS 并绘制占位豆豆
   */
  async function init() {
    if (!canvasRef.value || app.value) return

    const parent = canvasRef.value.parentElement
    if (!parent) return

    const pixiApp = new Application()
    await pixiApp.init({
      canvas: canvasRef.value,
      resizeTo: parent,
      backgroundAlpha: 0, // 透明背景，融入页面
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    app.value = pixiApp
    ready.value = true

    // 创建豆豆容器
    const container = new Container()
    container.x = pixiApp.screen.width / 2
    container.y = pixiApp.screen.height / 2
    pixiApp.stage.addChild(container)
    dodoContainer.value = container

    // 绘制占位豆豆（无 Spine 资源时的视觉效果）
    drawPlaceholderDodo(container)

    // 添加呼吸动画
    addBreathAnimation(container)
    // 添加浮动动画
    addFloatAnimation(container)
  }

  /**
   * 绘制占位豆豆（渐变光晕 + 种子精灵形状）
   */
  function drawPlaceholderDodo(container: Container) {
    // 外层光晕
    const glow = new Graphics()
    glow.circle(0, 0, 60)
    glow.fill({ color: 0xa29bfe, alpha: 0.15 })
    container.addChild(glow)

    // 中层柔光
    const midGlow = new Graphics()
    midGlow.circle(0, 0, 42)
    midGlow.fill({ color: 0x6c5ce7, alpha: 0.2 })
    container.addChild(midGlow)

    // 豆豆主体（种子形状 — 椭圆 + 小尾巴）
    const body = new Graphics()
    // 主体椭圆（用圆近似）
    body.circle(0, -5, 28)
    body.fill({ color: 0xdfe6e9 })
    body.stroke({ color: 0xb2bec3, width: 2 })

    // 小尾巴（蒲公英的绒毛梗）
    body.moveTo(0, -33)
    body.lineTo(-3, -48)
    body.lineTo(0, -52)
    body.lineTo(3, -48)
    body.closePath()
    body.fill({ color: 0xb2bec3 })

    // 绒毛顶端（小圆球）
    body.circle(0, -54, 6)
    body.fill({ color: 0xffffff, alpha: 0.9 })
    body.stroke({ color: 0xdfe6e9, width: 1 })

    // 眼睛（两个小圆点）
    const leftEye = new Graphics()
    leftEye.circle(-8, -8, 3.5)
    leftEye.fill({ color: 0x2d3436 })
    const leftShine = new Graphics()
    leftShine.circle(-7, -9.5, 1.2)
    leftShine.fill({ color: 0xffffff })

    const rightEye = new Graphics()
    rightEye.circle(8, -8, 3.5)
    rightEye.fill({ color: 0x2d3436 })
    const rightShine = new Graphics()
    rightShine.circle(9, -9.5, 1.2)
    rightShine.fill({ color: 0xffffff })

    // 腮红
    const leftBlush = new Graphics()
    leftBlush.circle(-14, 2, 5)
    leftBlush.fill({ color: 0xfd79a8, alpha: 0.3 })
    const rightBlush = new Graphics()
    rightBlush.circle(14, 2, 5)
    rightBlush.fill({ color: 0xfd79a8, alpha: 0.3 })

    // 嘴巴（微笑弧线）
    const mouth = new Graphics()
    mouth.arc(0, 2, 6, 0.2, Math.PI - 0.2, false)
    mouth.stroke({ color: 0x636e72, width: 1.5, cap: 'round' })

    container.addChild(body)
    container.addChild(leftEye)
    container.addChild(leftShine)
    container.addChild(rightEye)
    container.addChild(rightShine)
    container.addChild(leftBlush)
    container.addChild(rightBlush)
    container.addChild(mouth)

    // 星光粒子（围绕豆豆的小星星）
    addStarParticles(container)
  }

  /**
   * 星光粒子效果（3 颗小星星围绕豆豆旋转）
   */
  function addStarParticles(container: Container) {
    const particleContainer = new Container()
    particleContainer.name = 'starParticles'
    container.addChildAt(particleContainer, 0) // 放在最底层

    const starCount = 5
    const stars: Graphics[] = []

    for (let i = 0; i < starCount; i++) {
      const star = new Graphics()
      const size = 2 + Math.random() * 2
      // 小十字星
      star.moveTo(-size, 0)
      star.lineTo(size, 0)
      star.moveTo(0, -size)
      star.lineTo(0, size)
      star.stroke({ color: 0xfdcb6e, width: 1.5, alpha: 0.6 + Math.random() * 0.4, cap: 'round' })

      stars.push(star)
      particleContainer.addChild(star)
    }

    // 用 ticker 驱动旋转
    const rotTicker = new Ticker()
    let elapsed = 0
    rotTicker.add(() => {
      elapsed += rotTicker.deltaTime * 0.02
      stars.forEach((star, i) => {
        const angle = elapsed + (i * Math.PI * 2) / starCount
        const radius = 50 + Math.sin(elapsed * 2 + i) * 8
        star.x = Math.cos(angle) * radius
        star.y = Math.sin(angle) * radius
        star.alpha = 0.4 + Math.sin(elapsed * 3 + i * 1.5) * 0.4
      })
    })
    rotTicker.start()
    particleTicker = rotTicker
  }

  /**
   * 呼吸动画（整体缩放，模拟呼吸节奏）
   */
  function addBreathAnimation(container: Container) {
    const bTicker = new Ticker()
    let elapsed = 0
    bTicker.add(() => {
      elapsed += bTicker.deltaTime * 0.03
      const scale = 1 + Math.sin(elapsed) * 0.03 // ±3% 缩放
      container.scale.set(scale)
    })
    bTicker.start()
    breathTicker = bTicker
  }

  /**
   * 浮动动画（上下轻微浮动）
   */
  function addFloatAnimation(container: Container) {
    const baseY = container.y
    const fTicker = new Ticker()
    let elapsed = 0
    fTicker.add(() => {
      elapsed += fTicker.deltaTime * 0.02
      container.y = baseY + Math.sin(elapsed * 1.5) * 4 // ±4px 浮动
    })
    fTicker.start()
    floatTicker = fTicker
  }

  /**
   * 播放豆豆动画（预留 Spine 接口）
   */
  function playAnimation(_name: string) {
    // TODO: 接入 Spine 后实现
    // 当前用缩放弹跳模拟
    if (dodoContainer.value) {
      const c = dodoContainer.value
      const origScale = c.scale.x
      c.scale.set(origScale * 1.15)
      setTimeout(() => c.scale.set(origScale), 200)
    }
  }

  /**
   * 销毁 PixiJS 资源
   */
  function destroy() {
    breathTicker?.stop()
    breathTicker?.destroy()
    floatTicker?.stop()
    floatTicker?.destroy()
    particleTicker?.stop()
    particleTicker?.destroy()
    app.value?.destroy(true, { children: true })
    app.value = null
    ready.value = false
    dodoContainer.value = null
  }

  onMounted(() => {
    init()
  })

  onBeforeUnmount(() => {
    destroy()
  })

  return {
    ready,
    playAnimation,
    destroy,
  }
}
