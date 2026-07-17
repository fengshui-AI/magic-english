import express from 'express'
import cors from 'cors'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { petRoutes } from './routes/pets.js'
import { wordRoutes } from './routes/words.js'
import { learningRoutes } from './routes/learning.js'
import { emotionRoutes } from './routes/emotion.js'
import { streakRoutes } from './routes/streak.js'
import { profileRoutes } from './routes/profile.js'
import { reportRoutes } from './routes/reports.js'
import { dialogueRoutes } from './routes/dialogue.js'

const app = express()

// CORS 配置：开发环境宽松，生产环境严格白名单
const corsOrigins = (() => {
  // 生产环境：必须显式设置 CORS_ORIGINS
  if (process.env.NODE_ENV === 'production') {
    const origins = process.env.CORS_ORIGINS
    if (!origins) {
      console.error('⚠️  CORS_ORIGINS not set in production — allowing only same-origin requests')
      return []
    }
    return origins.split(',').map((s) => s.trim()).filter(Boolean)
  }
  // 开发环境：允许常见开发端口
  return ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173']
})()

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true, // true = 同源请求
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))

// Request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API v1 routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/pets', petRoutes)
app.use('/api/v1/words', wordRoutes)
app.use('/api/v1/learning', learningRoutes)
app.use('/api/v1/emotion', emotionRoutes)
app.use('/api/v1/streak', streakRoutes)
app.use('/api/v1/profile', profileRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/dialogue', dialogueRoutes)

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
