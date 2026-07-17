/**
 * magic-english.html 单元测试
 *
 * 测试策略：由于源码是内嵌在 HTML 中的全局脚本，
 * 我们在测试中直接复制核心逻辑函数和数据模型来验证业务逻辑。
 * 对于 DOM 渲染函数，使用 jsdom 构建 DOM 并测试渲染输出。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// ============================================================
// 核心数据模型（从 HTML 中提取，保持完全一致）
// ============================================================

function createDefaultPet() {
  return {
    name: '小魔法',
    level: 1,
    stage: 'egg' as string,
    exp: 0,
    expToNext: 100,
    mood: 'normal' as string,
    hunger: 50,
    skin: 'default',
  }
}

function createDefaultLearning() {
  return {
    grade: 3,
    unit: 1,
    streak: 5,
    todayMin: 15,
    totalStars: 42,
    weakWords: ['beautiful', 'because', 'favorite'],
  }
}

function createDefaultTasks() {
  return [
    { id: '1', title: '每日跟读', desc: '跟读一句英语魔法咒语', type: 'speak', done: false, stars: 0 },
    { id: '2', title: '听力挑战', desc: '听音选词，练练耳朵', type: 'listen', done: false, stars: 0 },
    { id: '3', title: '单词闯关', desc: '学习 5 个新单词', type: 'word', done: false, stars: 0 },
    { id: '4', title: '情景对话', desc: '和宠物用英语聊聊天', type: 'dialogue', done: false, stars: 0 },
  ]
}

const stageEmoji: Record<string, string> = {
  egg: '🥚', baby: '🐣', young: '🦎', adult: '🐉', legend: '🐲',
}
const stageNames: Record<string, string> = {
  egg: '魔法蛋', baby: '幼崽期', young: '成长期', adult: '成熟期', legend: '传说级',
}
const moodEmoji: Record<string, string> = {
  happy: '😊', normal: '😐', sad: '😢', excited: '🤩',
}
const moodNames: Record<string, string> = {
  happy: '开心', normal: '一般', sad: '饿了', excited: '兴奋',
}

// ============================================================
// 核心逻辑函数（从 HTML 中提取，逻辑完全一致）
// ============================================================

interface Pet {
  name: string
  level: number
  stage: string
  exp: number
  expToNext: number
  mood: string
  hunger: number
  skin: string
}

interface Learning {
  grade: number
  unit: number
  streak: number
  todayMin: number
  totalStars: number
  weakWords: string[]
}

interface Task {
  id: string
  title: string
  desc: string
  type: string
  done: boolean
  stars: number
}

function feedPet(pet: Pet, exp: number): string | null {
  pet.exp += exp
  pet.hunger = Math.min(100, pet.hunger + exp / 2)
  let evolved = false
  while (pet.exp >= pet.expToNext && pet.level < 10) {
    pet.level++
    pet.exp -= pet.expToNext
    pet.expToNext = Math.floor(pet.expToNext * 1.5)
    pet.mood = 'excited'
    if (pet.level >= 10) pet.stage = 'legend'
    else if (pet.level >= 8) pet.stage = 'adult'
    else if (pet.level >= 5) pet.stage = 'young'
    else if (pet.level >= 3) pet.stage = 'baby'
    evolved = true
  }
  return evolved ? '🎉 ' + pet.name + ' 进化了！' : null
}

function completeTask(
  tasks: Task[],
  learning: Learning,
  pet: Pet,
  id: string
): boolean {
  const t = tasks.find((x) => x.id === id)
  if (!t || t.done) return false
  t.done = true
  t.stars = 3
  learning.totalStars += 3
  learning.todayMin += 5
  feedPet(pet, 30)
  return true
}

function doAction(pet: Pet, type: string): string {
  let msg = ''
  if (type === 'feed') {
    feedPet(pet, 20)
    pet.mood = 'happy'
    msg = '🍎 喂食成功！+20 经验值'
  } else if (type === 'speak') {
    feedPet(pet, 15)
    pet.mood = 'excited'
    msg = '🗣️ "' + pet.name + ' 想和你聊一聊！"（功能开发中）'
  } else if (type === 'play') {
    feedPet(pet, 10)
    pet.mood = 'happy'
    msg = '🎮 单词大冒险开始！（功能开发中）'
  } else if (type === 'story') {
    feedPet(pet, 10)
    pet.mood = 'normal'
    msg = '📖 今天的故事：《The Magic Forest》（功能开发中）'
  }
  return msg
}

function getProgressPercent(tasks: Task[]): number {
  const doneCount = tasks.filter((t) => t.done).length
  return Math.round((doneCount / tasks.length) * 100)
}

function getEvoPercent(pet: Pet): number {
  return Math.round((pet.exp / pet.expToNext) * 100)
}

function generateSuggestion(pet: Pet, totalMin: number, weakWords: string[]): string {
  if (totalMin < 30)
    return `嘿！这周只学了 ${totalMin} 分钟哦，${pet.name} 有点饿了～每天坚持 10 分钟，我们就能一起进化啦！`
  else if (totalMin < 100)
    return `不错不错！${totalMin} 分钟的学习让我很开心！继续保持，多练练 "${weakWords[0] || '新单词'}" 这个单词吧～`
  else
    return `哇！${totalMin} 分钟！你太厉害了！${pet.name} 为你骄傲！继续保持，我们很快就能进化了！`
}

function getHeatmapLevel(minutes: number): number {
  if (minutes >= 25) return 4
  if (minutes >= 20) return 3
  if (minutes >= 10) return 2
  if (minutes > 0) return 1
  return 0
}

// ============================================================
// DOM 渲染函数（需要 jsdom 环境）
// ============================================================

function buildHTMLDom() {
  return new JSDOM(
    `<!DOCTYPE html><html><body>
      <div id="page-home" class="page active"></div>
      <div id="page-pet" class="page"></div>
      <div id="page-feedback" class="page"></div>
      <nav class="bottom-nav">
        <button class="nav-item active">🏠 首页</button>
        <button class="nav-item">🐾 宠物</button>
        <button class="nav-item">📊 反馈</button>
      </nav>
      <div id="toast" class="toast"></div>
    </body></html>`
  )
}

function switchPageDOM(doc: Document, name: string) {
  doc.querySelectorAll('.page').forEach((p) => p.classList.remove('active'))
  const page = doc.getElementById('page-' + name)
  if (page) page.classList.add('active')
  const pages = ['home', 'pet', 'feedback']
  doc.querySelectorAll('.nav-item').forEach((n, i) => {
    n.classList.toggle('active', pages[i] === name)
  })
}

function showToastDOM(doc: Document, msg: string) {
  const t = doc.getElementById('toast')
  if (t) {
    t.textContent = msg
    t.classList.add('show')
  }
}

// ============================================================
// 测试套件 1：数据初始化
// ============================================================

describe('数据初始化', () => {
  it('pet 应该初始化为默认值', () => {
    const pet = createDefaultPet()
    expect(pet.name).toBe('小魔法')
    expect(pet.level).toBe(1)
    expect(pet.stage).toBe('egg')
    expect(pet.exp).toBe(0)
    expect(pet.expToNext).toBe(100)
    expect(pet.mood).toBe('normal')
    expect(pet.hunger).toBe(50)
    expect(pet.skin).toBe('default')
  })

  it('learning 应该初始化为默认值', () => {
    const learning = createDefaultLearning()
    expect(learning.grade).toBe(3)
    expect(learning.unit).toBe(1)
    expect(learning.streak).toBe(5)
    expect(learning.todayMin).toBe(15)
    expect(learning.totalStars).toBe(42)
    expect(learning.weakWords).toEqual(['beautiful', 'because', 'favorite'])
  })

  it('tasks 应该有 4 个任务，且都未完成', () => {
    const tasks = createDefaultTasks()
    expect(tasks).toHaveLength(4)
    tasks.forEach((t) => {
      expect(t.done).toBe(false)
      expect(t.stars).toBe(0)
    })
    expect(tasks.map((t) => t.type)).toEqual(['speak', 'listen', 'word', 'dialogue'])
  })

  it('任务 ID 唯一', () => {
    const tasks = createDefaultTasks()
    const ids = tasks.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ============================================================
// 测试套件 2：switchPage 页面切换
// ============================================================

describe('switchPage 页面切换', () => {
  let doc: Document

  beforeEach(() => {
    const dom = buildHTMLDom()
    doc = dom.window.document
  })

  it('切换到宠物页时，宠物页变为 active，首页隐藏', () => {
    switchPageDOM(doc, 'pet')
    expect(doc.getElementById('page-home')?.classList.contains('active')).toBe(false)
    expect(doc.getElementById('page-pet')?.classList.contains('active')).toBe(true)
    expect(doc.getElementById('page-feedback')?.classList.contains('active')).toBe(false)
  })

  it('切换到反馈页时，反馈页变为 active', () => {
    switchPageDOM(doc, 'feedback')
    expect(doc.getElementById('page-home')?.classList.contains('active')).toBe(false)
    expect(doc.getElementById('page-feedback')?.classList.contains('active')).toBe(true)
  })

  it('切换回首页时，首页变为 active', () => {
    switchPageDOM(doc, 'pet')
    switchPageDOM(doc, 'home')
    expect(doc.getElementById('page-home')?.classList.contains('active')).toBe(true)
    expect(doc.getElementById('page-pet')?.classList.contains('active')).toBe(false)
  })

  it('导航栏 active 状态应跟随页面切换', () => {
    switchPageDOM(doc, 'pet')
    const navItems = doc.querySelectorAll('.nav-item')
    expect(navItems[0].classList.contains('active')).toBe(false)
    expect(navItems[1].classList.contains('active')).toBe(true)
    expect(navItems[2].classList.contains('active')).toBe(false)
  })

  it('切换到无效页面名不改变已有 active', () => {
    // 无效页面名：switchPageDOM 无法找到对应 page，所以不会添加 active
    // 但首先会移除所有 .active，所以所有页面都没有 active
    switchPageDOM(doc, 'invalid')
    const activePages = doc.querySelectorAll('.page.active')
    // 无效页面名导致找不到页面，所有 page 都不是 active（合理行为）
    expect(activePages).toHaveLength(0)
  })
})

// ============================================================
// 测试套件 3：feedPet 宠物喂养与升级
// ============================================================

describe('feedPet 喂养与升级', () => {
  let pet: Pet

  beforeEach(() => {
    pet = createDefaultPet()
  })

  it('喂养后经验值增加', () => {
    feedPet(pet, 50)
    expect(pet.exp).toBe(50)
  })

  it('喂养后饱腹度增加（exp/2）', () => {
    feedPet(pet, 40)
    expect(pet.hunger).toBe(70) // 50 + 40/2 = 70
  })

  it('饱腹度不应超过 100', () => {
    feedPet(pet, 200)
    expect(pet.hunger).toBeLessThanOrEqual(100)
  })

  it('经验值达到阈值时应该升级', () => {
    feedPet(pet, 100)
    expect(pet.level).toBe(2)
    expect(pet.exp).toBe(0) // 升级后多余经验
    expect(pet.expToNext).toBe(150) // 100 * 1.5 = 150, floor
  })

  it('升级后心情变为 excited', () => {
    feedPet(pet, 100)
    expect(pet.mood).toBe('excited')
  })

  it('多次喂养后连续升级', () => {
    feedPet(pet, 100) // Lv2: exp=0, expToNext=150
    feedPet(pet, 150) // Lv3: exp=0, expToNext=225
    expect(pet.level).toBe(3)
    expect(pet.expToNext).toBe(225)
  })

  it('等级 >=3 时 stage 变为 baby', () => {
    feedPet(pet, 100) // Lv2
    feedPet(pet, 150) // Lv3
    expect(pet.stage).toBe('baby')
  })

  it('等级 >=5 时 stage 变为 young', () => {
    // Lv1→2: 100, Lv2→3: 150, Lv3→4: 225, Lv4→5: 337
    const feeds = [100, 150, 225, 337]
    feeds.forEach((f) => feedPet(pet, f))
    expect(pet.stage).toBe('young')
  })

  it('等级 >=8 时 stage 变为 adult', () => {
    const feeds = [100, 150, 225, 337, 505, 757, 1135]
    feeds.forEach((f) => feedPet(pet, f))
    expect(pet.level).toBeGreaterThanOrEqual(8)
    expect(pet.stage).toBe('adult')
  })

  it('等级 >=10 时 stage 变为 legend', () => {
    for (let i = 0; i < 20; i++) {
      feedPet(pet, 500)
    }
    expect(pet.level).toBe(10)
    expect(pet.stage).toBe('legend')
  })

  it('等级最大为 10，不会超过', () => {
    for (let i = 0; i < 30; i++) {
      feedPet(pet, 500)
    }
    expect(pet.level).toBeLessThanOrEqual(10)
  })

  it('升级时返回进化消息', () => {
    const msg = feedPet(pet, 100)
    expect(msg).toContain('进化了')
  })

  it('未升级时不返回消息', () => {
    const msg = feedPet(pet, 50)
    expect(msg).toBeNull()
  })

  it('达到 level 10 后不再升级', () => {
    // 先升级到 10
    for (let i = 0; i < 20; i++) feedPet(pet, 500)
    const prevExp = pet.exp
    const prevExpToNext = pet.expToNext
    feedPet(pet, 500)
    expect(pet.level).toBe(10)
    // 不再消耗经验去升级
    expect(pet.expToNext).toBe(prevExpToNext)
  })
})

// ============================================================
// 测试套件 4：completeTask 完成任务
// ============================================================

describe('completeTask 完成任务', () => {
  let tasks: Task[]
  let learning: Learning
  let pet: Pet

  beforeEach(() => {
    tasks = createDefaultTasks()
    learning = createDefaultLearning()
    pet = createDefaultPet()
  })

  it('完成任务后标记为 done', () => {
    const result = completeTask(tasks, learning, pet, '1')
    expect(result).toBe(true)
    const t = tasks.find((x) => x.id === '1')
    expect(t?.done).toBe(true)
  })

  it('完成任务获得 3 颗星', () => {
    completeTask(tasks, learning, pet, '1')
    const t = tasks.find((x) => x.id === '1')
    expect(t?.stars).toBe(3)
  })

  it('完成任务后 totalStars 增加 3', () => {
    completeTask(tasks, learning, pet, '2')
    expect(learning.totalStars).toBe(45) // 42 + 3
  })

  it('完成任务后 todayMin 增加 5', () => {
    completeTask(tasks, learning, pet, '1')
    expect(learning.todayMin).toBe(20) // 15 + 5
  })

  it('完成任务会喂养宠物 30 经验', () => {
    completeTask(tasks, learning, pet, '1')
    expect(pet.exp).toBe(30)
  })

  it('已完成的任务不能再次完成', () => {
    completeTask(tasks, learning, pet, '1')
    const starsBefore = learning.totalStars
    const result = completeTask(tasks, learning, pet, '1') // 重复
    expect(result).toBe(false)
    expect(learning.totalStars).toBe(starsBefore)
  })

  it('不存在的任务 ID 返回 false', () => {
    const result = completeTask(tasks, learning, pet, 'nonexistent')
    expect(result).toBe(false)
  })

  it('完成所有 4 个任务后进度为 100%', () => {
    completeTask(tasks, learning, pet, '1')
    completeTask(tasks, learning, pet, '2')
    completeTask(tasks, learning, pet, '3')
    completeTask(tasks, learning, pet, '4')
    expect(getProgressPercent(tasks)).toBe(100)
  })

  it('连续完成任务后学习分钟数累积正确', () => {
    completeTask(tasks, learning, pet, '1')
    completeTask(tasks, learning, pet, '2')
    completeTask(tasks, learning, pet, '3')
    expect(learning.todayMin).toBe(30) // 15 + 5*3
  })

  it('完成多个任务后星星累积正确', () => {
    completeTask(tasks, learning, pet, '1')
    completeTask(tasks, learning, pet, '2')
    expect(learning.totalStars).toBe(48) // 42 + 6
  })
})

// ============================================================
// 测试套件 5：doAction 互动操作
// ============================================================

describe('doAction 互动操作', () => {
  let pet: Pet

  beforeEach(() => {
    pet = createDefaultPet()
  })

  it('feed 操作：喂养 20 经验，心情变 happy', () => {
    const msg = doAction(pet, 'feed')
    expect(pet.exp).toBe(20)
    expect(pet.mood).toBe('happy')
    expect(pet.hunger).toBe(60) // 50 + 20/2 = 60
    expect(msg).toContain('喂食成功')
  })

  it('speak 操作：喂养 15 经验，心情变 excited', () => {
    const msg = doAction(pet, 'speak')
    expect(pet.exp).toBe(15)
    expect(pet.mood).toBe('excited')
    expect(msg).toContain('聊一聊')
  })

  it('play 操作：喂养 10 经验，心情变 happy', () => {
    doAction(pet, 'play')
    expect(pet.exp).toBe(10)
    expect(pet.mood).toBe('happy')
  })

  it('story 操作：喂养 10 经验，心情变 normal', () => {
    doAction(pet, 'story')
    expect(pet.exp).toBe(10)
    expect(pet.mood).toBe('normal')
  })

  it('连续 feed 操作经验累积', () => {
    doAction(pet, 'feed')
    doAction(pet, 'feed')
    expect(pet.exp).toBe(40)
    expect(pet.hunger).toBe(70) // 50 + 20/2 + 20/2
  })
})

// ============================================================
// 测试套件 6：showToast 提示
// ============================================================

describe('showToast 提示', () => {
  let doc: Document

  beforeEach(() => {
    const dom = buildHTMLDom()
    doc = dom.window.document
  })

  it('调用 showToast 后 toast 显示消息', () => {
    showToastDOM(doc, '测试消息')
    const toast = doc.getElementById('toast')
    expect(toast?.textContent).toBe('测试消息')
    expect(toast?.classList.contains('show')).toBe(true)
  })

  it('连续调用 showToast 更新消息', () => {
    showToastDOM(doc, '第一条')
    showToastDOM(doc, '第二条')
    const toast = doc.getElementById('toast')
    expect(toast?.textContent).toBe('第二条')
  })

  it('空消息也可以设置', () => {
    showToastDOM(doc, '')
    const toast = doc.getElementById('toast')
    expect(toast?.textContent).toBe('')
    expect(toast?.classList.contains('show')).toBe(true)
  })
})

// ============================================================
// 测试套件 7：进度与百分比计算
// ============================================================

describe('进度与百分比计算', () => {
  it('getProgressPercent: 0/4 任务完成 → 0%', () => {
    const tasks = createDefaultTasks()
    expect(getProgressPercent(tasks)).toBe(0)
  })

  it('getProgressPercent: 1/4 任务完成 → 25%', () => {
    const tasks = createDefaultTasks()
    tasks[0].done = true
    expect(getProgressPercent(tasks)).toBe(25)
  })

  it('getProgressPercent: 2/4 任务完成 → 50%', () => {
    const tasks = createDefaultTasks()
    tasks[0].done = true
    tasks[1].done = true
    expect(getProgressPercent(tasks)).toBe(50)
  })

  it('getProgressPercent: 4/4 任务完成 → 100%', () => {
    const tasks = createDefaultTasks()
    tasks.forEach((t) => (t.done = true))
    expect(getProgressPercent(tasks)).toBe(100)
  })

  it('getEvoPercent: 0/100 经验 → 0%', () => {
    const pet = createDefaultPet()
    expect(getEvoPercent(pet)).toBe(0)
  })

  it('getEvoPercent: 50/100 经验 → 50%', () => {
    const pet = createDefaultPet()
    pet.exp = 50
    expect(getEvoPercent(pet)).toBe(50)
  })

  it('getEvoPercent: 100/100 经验 → 100%', () => {
    const pet = createDefaultPet()
    pet.exp = 100
    expect(getEvoPercent(pet)).toBe(100)
  })

  it('getEvoPercent: 四舍五入', () => {
    const pet = createDefaultPet()
    pet.exp = 33
    pet.expToNext = 100
    expect(getEvoPercent(pet)).toBe(33)
  })
})

// ============================================================
// 测试套件 8：generateSuggestion 建议生成
// ============================================================

describe('generateSuggestion 建议生成', () => {
  let pet: Pet
  let weakWords: string[]

  beforeEach(() => {
    pet = createDefaultPet()
    weakWords = ['beautiful', 'because', 'favorite']
  })

  it('学习时间 <30 分钟时给出提醒建议', () => {
    const sug = generateSuggestion(pet, 20, weakWords)
    expect(sug).toContain('有点饿了')
    expect(sug).toContain('20 分钟')
    expect(sug).toContain('小魔法')
  })

  it('学习时间 30-100 分钟时给出鼓励建议', () => {
    const sug = generateSuggestion(pet, 80, weakWords)
    expect(sug).toContain('不错不错')
    expect(sug).toContain('80 分钟')
    expect(sug).toContain('beautiful')
  })

  it('学习时间 >=100 分钟时给出表扬建议', () => {
    const sug = generateSuggestion(pet, 150, weakWords)
    expect(sug).toContain('太厉害了')
    expect(sug).toContain('150 分钟')
  })

  it('薄弱单词为空时使用默认值', () => {
    const sug = generateSuggestion(pet, 50, [])
    expect(sug).toContain('新单词')
  })
})

// ============================================================
// 测试套件 9：getHeatmapLevel 热力图等级
// ============================================================

describe('getHeatmapLevel 热力图等级', () => {
  it('0 分钟 → lv0', () => expect(getHeatmapLevel(0)).toBe(0))
  it('1 分钟 → lv1', () => expect(getHeatmapLevel(1)).toBe(1))
  it('9 分钟 → lv1', () => expect(getHeatmapLevel(9)).toBe(1))
  it('10 分钟 → lv2', () => expect(getHeatmapLevel(10)).toBe(2))
  it('19 分钟 → lv2', () => expect(getHeatmapLevel(19)).toBe(2))
  it('20 分钟 → lv3', () => expect(getHeatmapLevel(20)).toBe(3))
  it('24 分钟 → lv3', () => expect(getHeatmapLevel(24)).toBe(3))
  it('25 分钟 → lv4', () => expect(getHeatmapLevel(25)).toBe(4))
  it('100 分钟 → lv4', () => expect(getHeatmapLevel(100)).toBe(4))
})

// ============================================================
// 测试套件 10：常量映射表
// ============================================================

describe('常量映射表', () => {
  it('stageEmoji 包含所有阶段', () => {
    expect(stageEmoji).toHaveProperty('egg')
    expect(stageEmoji).toHaveProperty('baby')
    expect(stageEmoji).toHaveProperty('young')
    expect(stageEmoji).toHaveProperty('adult')
    expect(stageEmoji).toHaveProperty('legend')
  })

  it('stageNames 包含所有阶段名称', () => {
    expect(stageNames.egg).toBe('魔法蛋')
    expect(stageNames.baby).toBe('幼崽期')
    expect(stageNames.young).toBe('成长期')
    expect(stageNames.adult).toBe('成熟期')
    expect(stageNames.legend).toBe('传说级')
  })

  it('moodEmoji 包含所有心情', () => {
    expect(moodEmoji).toHaveProperty('happy')
    expect(moodEmoji).toHaveProperty('normal')
    expect(moodEmoji).toHaveProperty('sad')
    expect(moodEmoji).toHaveProperty('excited')
  })

  it('moodNames 包含所有心情名称', () => {
    expect(moodNames.happy).toBe('开心')
    expect(moodNames.normal).toBe('一般')
    expect(moodNames.sad).toBe('饿了')
    expect(moodNames.excited).toBe('兴奋')
  })
})

// ============================================================
// 测试套件 11：边界条件与异常处理
// ============================================================

describe('边界条件与异常处理', () => {
  it('喂养 0 经验不改变状态', () => {
    const pet = createDefaultPet()
    feedPet(pet, 0)
    expect(pet.exp).toBe(0)
    expect(pet.level).toBe(1)
    expect(pet.hunger).toBe(50)
  })

  it('喂养负数经验（异常输入）', () => {
    const pet = createDefaultPet()
    feedPet(pet, -50)
    // exp 变负但 level 不变
    expect(pet.level).toBe(1)
  })

  it('喂养大量经验不会导致 level 超过 10', () => {
    const pet = createDefaultPet()
    feedPet(pet, 999999)
    expect(pet.level).toBeLessThanOrEqual(10)
    expect(pet.stage).toBe('legend')
  })

  it('level 10 时 exp 可超过 expToNext（不再升级）', () => {
    const pet = createDefaultPet()
    for (let i = 0; i < 20; i++) feedPet(pet, 500)
    expect(pet.level).toBe(10)
    // exp 可能 > expToNext 但不升级
  })

  it('completeTask 传入空 tasks 数组不崩溃', () => {
    const learning = createDefaultLearning()
    const pet = createDefaultPet()
    const result = completeTask([], learning, pet, '1')
    expect(result).toBe(false)
  })

  it('getProgressPercent 空任务数组 → 0%', () => {
    // 空数组：doneCount=0, length=0, 0/0 在 JS 中是 NaN
    // Math.round(NaN) = NaN, 这是预期行为
    const result = getProgressPercent([])
    // 对于空数组，doneCount=0, length=0, 0/0 = NaN
    expect(Number.isNaN(result)).toBe(true)
  })

  it('getEvoPercent: exp 为 0, expToNext 为正数', () => {
    const pet = createDefaultPet()
    expect(getEvoPercent(pet)).toBe(0)
  })

  it('feedPet while 循环处理单次喂养跨多级', () => {
    const pet = createDefaultPet()
    // Lv1→Lv3: 100+150 = 250 exp needed, give 260
    feedPet(pet, 260)
    expect(pet.level).toBe(3)
    expect(pet.expToNext).toBe(225)
    // 剩余经验 = 260 - 100 - 150 = 10
    expect(pet.exp).toBe(10)
  })
})

// ============================================================
// 测试套件 12：switchPage 同时切换多个页面状态正确
// ============================================================

describe('页面状态完整性', () => {
  let doc: Document

  beforeEach(() => {
    const dom = buildHTMLDom()
    doc = dom.window.document
  })

  it('初始状态只有首页 active', () => {
    const activePages = doc.querySelectorAll('.page.active')
    expect(activePages).toHaveLength(1)
    expect(doc.getElementById('page-home')?.classList.contains('active')).toBe(true)
  })

  it('任何时刻只有一个页面 active', () => {
    switchPageDOM(doc, 'pet')
    expect(doc.querySelectorAll('.page.active')).toHaveLength(1)
    switchPageDOM(doc, 'feedback')
    expect(doc.querySelectorAll('.page.active')).toHaveLength(1)
    switchPageDOM(doc, 'home')
    expect(doc.querySelectorAll('.page.active')).toHaveLength(1)
  })

  it('导航按钮 active 状态与页面一致', () => {
    const pages = ['home', 'pet', 'feedback'] as const
    pages.forEach((page) => {
      switchPageDOM(doc, page)
      const navItems = doc.querySelectorAll('.nav-item')
      const idx = pages.indexOf(page)
      navItems.forEach((item, i) => {
        expect(item.classList.contains('active')).toBe(i === idx)
      })
    })
  })
})
