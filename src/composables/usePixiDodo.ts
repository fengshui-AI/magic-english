import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { Application, Graphics, Container, Ticker } from 'pixi.js'

/**
 * 支持的动画名称（与 Spine 骨骼动画命名对齐，确保迁移无缝）
 */
type AnimationName =
  | 'idle'
  | 'happy'
  | 'excited'
  | 'eat'
  | 'sleep'
  | 'sad'
  | 'think'
  | 'surprise'
  | 'wave'
  | 'bounce'
  | 'nod'

/**
 * PixiJS 豆豆渲染 composable
 * 管理 PixiJS Application 的完整生命周期
 *
 * 当前阶段（无 Spine 资源）：
 *   - 用 Graphics 绘制可爱的种子精灵豆豆
 *   - 呼吸光晕 + 浮动动画 + 星光粒子
 *   - playAnimation 支持 11 种动画的 CSS 级模拟效果
 *
 * 后续阶段（接入 Spine 后）：
 *   - 替换 drawPlaceholderDodo → 加载真实骨骼动画
 *   - playAnimation 调用 SpineLoader.playAnimation
 *   - 接口完全兼容，业务代码无需修改
 */
export function usePixiDodo(canvasRef: Ref<HTMLCanvasElement | null>) {
  const app = ref<Application | null>(null)
  const ready = ref(false)
  const dodoContainer = ref<Container | null>(null)
  const currentAnimation = ref<AnimationName>('idle')

  let breathTicker: Ticker | null = null
  let floatTicker: Ticker | null = null
  let particleTicker: Ticker | null = null
  let animTimeout: ReturnType<typeof setTimeout> | null = null

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
   * 播放豆豆动画
   *
   * 当前用 PixiJS Graphics 属性模拟（缩放/旋转/位移/透明度变化），
   * 后续接入 Spine 后替换为真实骨骼动画调用，接口保持不变。
   */
  function playAnimation(name: AnimationName) {
    if (!dodoContainer.value) return
    const c = dodoContainer.value
    const origScale = c.scale.x
    const origAlpha = c.alpha
    const origX = c.x
    const origY = c.y
    const origRotation = c.rotation

    // 清除上一次动画的残留定时器
    if (animTimeout) {
      clearTimeout(animTimeout)
      // 恢复基础状态
      c.scale.set(origScale)
      c.alpha = origAlpha
      c.rotation = origRotation
    }

    currentAnimation.value = name

    const duration = 400 // 动画持续时间（ms）
    const framesPerTick = 4
    const tickMs = duration / framesPerTick

    switch (name) {
      case 'happy': {
        // 左右摇摆 + 轻微弹跳
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          c.rotation = Math.sin(t * Math.PI * 2) * 0.08
          c.scale.set(origScale * (1 + 0.05 * Math.sin(t * Math.PI * 2)))
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.rotation = origRotation
          c.scale.set(origScale)
        }, duration)
        break
      }

      case 'excited': {
        // 快速缩放弹跳 + 微微旋转
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * 0.12
          c.scale.set(origScale * (1 + bounce))
          c.rotation = Math.sin(t * Math.PI * 4) * 0.1
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.rotation = origRotation
          c.scale.set(origScale)
        }, duration)
        break
      }

      case 'eat': {
        // 快速小幅度缩放（模拟咀嚼）
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          c.scale.set(origScale * (1 + 0.06 * Math.sin(t * Math.PI * 6)))
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.scale.set(origScale)
        }, duration)
        break
      }

      case 'sleep': {
        // 缓慢缩小 + 降低透明度（模拟入睡）
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          c.scale.set(origScale * (1 - 0.08 * t))
          c.alpha = origAlpha * (1 - 0.2 * t)
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.scale.set(origScale)
          c.alpha = origAlpha
        }, duration)
        break
      }

      case 'sad': {
        // 缓慢缩小 + 微微低头
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          c.scale.set(origScale * (1 - 0.06 * t))
          c.rotation = -0.06 * t
          c.y = origY + 4 * t
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.scale.set(origScale)
          c.rotation = origRotation
          c.y = origY
        }, duration)
        break
      }

      case 'think': {
        // 左右轻摆（思考中）
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          c.rotation = Math.sin(t * Math.PI * 3) * 0.06
          c.x = origX + Math.sin(t * Math.PI * 2) * 3
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.rotation = origRotation
          c.x = origX
        }, duration)
        break
      }

      case 'surprise': {
        // 先缩小，再放大，恢复（受惊反应）
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          // 缩→放→回
          let s: number
          if (t < 0.25) s = 1 - 0.08 * (t / 0.25)       // 缩小
          else if (t < 0.5) s = 0.92 + 0.18 * ((t - 0.25) / 0.25) // 放大
          else s = 1.1 - 0.1 * ((t - 0.5) / 0.5)         // 恢复
          c.scale.set(origScale * s)
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.scale.set(origScale)
        }, duration)
        break
      }

      case 'wave': {
        // 左右位移（挥手）
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          c.x = origX + Math.sin(t * Math.PI * 4) * 8
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.x = origX
        }, duration)
        break
      }

      case 'bounce': {
        // 连续弹跳（上下位移）
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          const bounceY = -Math.abs(Math.sin(t * Math.PI * 3)) * 12
          c.y = origY + bounceY
          c.scale.set(origScale * (1 + 0.04 * Math.abs(Math.sin(t * Math.PI * 3))))
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.y = origY
          c.scale.set(origScale)
        }, duration)
        break
      }

      case 'nod': {
        // 点头（微微前倾后恢复）
        let frame = 0
        const tick = setInterval(() => {
          if (frame >= framesPerTick) { clearInterval(tick); return }
          const t = frame / framesPerTick
          c.rotation = Math.sin(t * Math.PI * 2) * 0.1
          c.y = origY + Math.abs(Math.sin(t * Math.PI)) * 3
          frame++
        }, tickMs)
        animTimeout = setTimeout(() => {
          c.rotation = origRotation
          c.y = origY
        }, duration)
        break
      }

      case 'idle':
      default: {
        // idle：不做特殊动画，保持呼吸+浮动
        break
      }
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
    if (animTimeout) {
      clearTimeout(animTimeout)
      animTimeout = null
    }
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
    currentAnimation,
    playAnimation,
    destroy,
  }
}
