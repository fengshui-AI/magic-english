/* eslint-disable no-console -- seed script output */

import { db, words, users } from '../index.js'
import { eq } from 'drizzle-orm'

// ============================================================
// P0 核心词库（60 个单词，覆盖 3 个主题 × 3 个年级段）
// ============================================================
const seedWords = [
  // 动物主题 (animal) — 1-2 年级 (grade 1-2)
  {
    word: 'cat',
    translation: '猫',
    phonetic: '/kæt/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'animal',
  },
  {
    word: 'dog',
    translation: '狗',
    phonetic: '/dɒɡ/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'animal',
  },
  {
    word: 'fish',
    translation: '鱼',
    phonetic: '/fɪʃ/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'animal',
  },
  {
    word: 'bird',
    translation: '鸟',
    phonetic: '/bɜːrd/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'animal',
  },
  {
    word: 'rabbit',
    translation: '兔子',
    phonetic: '/ˈræbɪt/',
    difficulty: 2,
    gradeLevel: 2,
    theme: 'animal',
  },
  {
    word: 'monkey',
    translation: '猴子',
    phonetic: '/ˈmʌŋki/',
    difficulty: 2,
    gradeLevel: 2,
    theme: 'animal',
  },
  {
    word: 'elephant',
    translation: '大象',
    phonetic: '/ˈelɪfənt/',
    difficulty: 3,
    gradeLevel: 2,
    theme: 'animal',
  },
  {
    word: 'lion',
    translation: '狮子',
    phonetic: '/ˈlaɪən/',
    difficulty: 2,
    gradeLevel: 1,
    theme: 'animal',
  },
  {
    word: 'tiger',
    translation: '老虎',
    phonetic: '/ˈtaɪɡər/',
    difficulty: 2,
    gradeLevel: 2,
    theme: 'animal',
  },
  {
    word: 'bear',
    translation: '熊',
    phonetic: '/ber/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'animal',
  },

  // 动物主题 — 3-4 年级
  {
    word: 'dolphin',
    translation: '海豚',
    phonetic: '/ˈdɑːlfɪn/',
    difficulty: 3,
    gradeLevel: 3,
    theme: 'animal',
  },
  {
    word: 'giraffe',
    translation: '长颈鹿',
    phonetic: '/dʒəˈræf/',
    difficulty: 3,
    gradeLevel: 3,
    theme: 'animal',
  },
  {
    word: 'penguin',
    translation: '企鹅',
    phonetic: '/ˈpeŋɡwɪn/',
    difficulty: 3,
    gradeLevel: 4,
    theme: 'animal',
  },
  {
    word: 'butterfly',
    translation: '蝴蝶',
    phonetic: '/ˈbʌtərflaɪ/',
    difficulty: 3,
    gradeLevel: 3,
    theme: 'animal',
  },
  {
    word: 'tortoise',
    translation: '乌龟',
    phonetic: '/ˈtɔːrtəs/',
    difficulty: 3,
    gradeLevel: 4,
    theme: 'animal',
  },
  {
    word: 'squirrel',
    translation: '松鼠',
    phonetic: '/ˈskwɜːrəl/',
    difficulty: 4,
    gradeLevel: 4,
    theme: 'animal',
  },
  {
    word: 'parrot',
    translation: '鹦鹉',
    phonetic: '/ˈpærət/',
    difficulty: 2,
    gradeLevel: 3,
    theme: 'animal',
  },
  {
    word: 'crocodile',
    translation: '鳄鱼',
    phonetic: '/ˈkrɑːkədaɪl/',
    difficulty: 4,
    gradeLevel: 4,
    theme: 'animal',
  },
  {
    word: 'kangaroo',
    translation: '袋鼠',
    phonetic: '/ˌkæŋɡəˈruː/',
    difficulty: 4,
    gradeLevel: 3,
    theme: 'animal',
  },
  {
    word: 'octopus',
    translation: '章鱼',
    phonetic: '/ˈɑːktəpʊs/',
    difficulty: 3,
    gradeLevel: 4,
    theme: 'animal',
  },

  // 太空主题 (space) — 3-4 年级
  {
    word: 'sun',
    translation: '太阳',
    phonetic: '/sʌn/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'space',
  },
  {
    word: 'moon',
    translation: '月亮',
    phonetic: '/muːn/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'space',
  },
  {
    word: 'star',
    translation: '星星',
    phonetic: '/stɑːr/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'space',
  },
  {
    word: 'earth',
    translation: '地球',
    phonetic: '/ɜːrθ/',
    difficulty: 2,
    gradeLevel: 3,
    theme: 'space',
  },
  {
    word: 'planet',
    translation: '行星',
    phonetic: '/ˈplænɪt/',
    difficulty: 3,
    gradeLevel: 4,
    theme: 'space',
  },
  {
    word: 'rocket',
    translation: '火箭',
    phonetic: '/ˈrɑːkɪt/',
    difficulty: 2,
    gradeLevel: 3,
    theme: 'space',
  },
  {
    word: 'astronaut',
    translation: '宇航员',
    phonetic: '/ˈæstrənɔːt/',
    difficulty: 4,
    gradeLevel: 4,
    theme: 'space',
  },
  {
    word: 'galaxy',
    translation: '银河',
    phonetic: '/ˈɡæləksi/',
    difficulty: 4,
    gradeLevel: 4,
    theme: 'space',
  },
  {
    word: 'comet',
    translation: '彗星',
    phonetic: '/ˈkɑːmɪt/',
    difficulty: 3,
    gradeLevel: 3,
    theme: 'space',
  },
  {
    word: 'orbit',
    translation: '轨道',
    phonetic: '/ˈɔːrbɪt/',
    difficulty: 3,
    gradeLevel: 4,
    theme: 'space',
  },

  // 太空主题 — 5-6 年级
  {
    word: 'satellite',
    translation: '卫星',
    phonetic: '/ˈsætəlaɪt/',
    difficulty: 4,
    gradeLevel: 5,
    theme: 'space',
  },
  {
    word: 'telescope',
    translation: '望远镜',
    phonetic: '/ˈtelɪskoʊp/',
    difficulty: 4,
    gradeLevel: 5,
    theme: 'space',
  },
  {
    word: 'universe',
    translation: '宇宙',
    phonetic: '/ˈjuːnɪvɜːrs/',
    difficulty: 4,
    gradeLevel: 5,
    theme: 'space',
  },
  {
    word: 'gravity',
    translation: '重力',
    phonetic: '/ˈɡrævəti/',
    difficulty: 4,
    gradeLevel: 6,
    theme: 'space',
  },
  {
    word: 'atmosphere',
    translation: '大气层',
    phonetic: '/ˈætməsfɪr/',
    difficulty: 5,
    gradeLevel: 6,
    theme: 'space',
  },
  {
    word: 'constellation',
    translation: '星座',
    phonetic: '/ˌkɑːnstəˈleɪʃn/',
    difficulty: 5,
    gradeLevel: 6,
    theme: 'space',
  },
  {
    word: 'meteor',
    translation: '流星',
    phonetic: '/ˈmiːtiər/',
    difficulty: 3,
    gradeLevel: 5,
    theme: 'space',
  },
  {
    word: 'eclipse',
    translation: '日食/月食',
    phonetic: '/ɪˈklɪps/',
    difficulty: 4,
    gradeLevel: 5,
    theme: 'space',
  },
  {
    word: 'nebula',
    translation: '星云',
    phonetic: '/ˈnebjələ/',
    difficulty: 5,
    gradeLevel: 6,
    theme: 'space',
  },
  {
    word: 'spacecraft',
    translation: '宇宙飞船',
    phonetic: '/ˈspeɪskræft/',
    difficulty: 4,
    gradeLevel: 5,
    theme: 'space',
  },

  // 校园主题 (school) — 1-2 年级
  {
    word: 'book',
    translation: '书',
    phonetic: '/bʊk/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'school',
  },
  {
    word: 'pen',
    translation: '笔',
    phonetic: '/pen/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'school',
  },
  {
    word: 'desk',
    translation: '课桌',
    phonetic: '/desk/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'school',
  },
  {
    word: 'bag',
    translation: '书包',
    phonetic: '/bæɡ/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'school',
  },
  {
    word: 'teacher',
    translation: '老师',
    phonetic: '/ˈtiːtʃər/',
    difficulty: 2,
    gradeLevel: 2,
    theme: 'school',
  },
  {
    word: 'friend',
    translation: '朋友',
    phonetic: '/frend/',
    difficulty: 1,
    gradeLevel: 2,
    theme: 'school',
  },
  {
    word: 'classroom',
    translation: '教室',
    phonetic: '/ˈklæsruːm/',
    difficulty: 3,
    gradeLevel: 2,
    theme: 'school',
  },
  {
    word: 'playground',
    translation: '操场',
    phonetic: '/ˈpleɪɡraʊnd/',
    difficulty: 3,
    gradeLevel: 2,
    theme: 'school',
  },
  {
    word: 'homework',
    translation: '家庭作业',
    phonetic: '/ˈhoʊmwɜːrk/',
    difficulty: 2,
    gradeLevel: 2,
    theme: 'school',
  },
  {
    word: 'pencil',
    translation: '铅笔',
    phonetic: '/ˈpensl/',
    difficulty: 1,
    gradeLevel: 1,
    theme: 'school',
  },

  // 校园主题 — 3-4 年级
  {
    word: 'library',
    translation: '图书馆',
    phonetic: '/ˈlaɪbreri/',
    difficulty: 3,
    gradeLevel: 3,
    theme: 'school',
  },
  {
    word: 'science',
    translation: '科学',
    phonetic: '/ˈsaɪəns/',
    difficulty: 2,
    gradeLevel: 3,
    theme: 'school',
  },
  {
    word: 'subject',
    translation: '科目',
    phonetic: '/ˈsʌbdʒɪkt/',
    difficulty: 3,
    gradeLevel: 4,
    theme: 'school',
  },
  {
    word: 'dictionary',
    translation: '字典',
    phonetic: '/ˈdɪkʃəneri/',
    difficulty: 4,
    gradeLevel: 4,
    theme: 'school',
  },
  {
    word: 'experiment',
    translation: '实验',
    phonetic: '/ɪkˈsperɪmənt/',
    difficulty: 4,
    gradeLevel: 4,
    theme: 'school',
  },
  {
    word: 'blackboard',
    translation: '黑板',
    phonetic: '/ˈblækbɔːrd/',
    difficulty: 3,
    gradeLevel: 3,
    theme: 'school',
  },
  {
    word: 'exercise',
    translation: '练习',
    phonetic: '/ˈeksərsaɪz/',
    difficulty: 3,
    gradeLevel: 3,
    theme: 'school',
  },
  {
    word: 'language',
    translation: '语言',
    phonetic: '/ˈlæŋɡwɪdʒ/',
    difficulty: 3,
    gradeLevel: 3,
    theme: 'school',
  },
  {
    word: 'notebook',
    translation: '笔记本',
    phonetic: '/ˈnoʊtbʊk/',
    difficulty: 2,
    gradeLevel: 3,
    theme: 'school',
  },
  {
    word: 'homework',
    translation: '家庭作业',
    phonetic: '/ˈhoʊmwɜːrk/',
    difficulty: 2,
    gradeLevel: 4,
    theme: 'school',
  },
]

async function seed() {
  console.log('🌱 Seeding database...')

  // Check if already seeded
  const existing = await db.select().from(words).limit(1)
  if (existing.length > 0) {
    console.log('⚠️  Words table already has data. Skipping seed.')
    console.log('   To re-seed, truncate the words table first.')
    return
  }

  // Insert words
  for (const w of seedWords) {
    await db.insert(words).values(w)
  }
  console.log(`✅ Seeded ${seedWords.length} words`)

  // Create a demo child user for testing
  const [demoUser] = await db
    .insert(users)
    .values({
      name: '小明',
      role: 'child',
      grade: 3,
      ageSegment: 'mid',
    })
    .returning()

  console.log(`✅ Created demo user: ${demoUser.name} (id: ${demoUser.id})`)
  console.log('🎉 Seed complete!')
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0))
