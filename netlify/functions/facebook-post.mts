import { endpoint } from './_lib/middleware.mts'
import crypto from 'crypto'

// Endpoint: POST /api/facebook-post  body: { type, customMessage? }
// Simule la création d'un post et applique des règles simples de rate limiting.

const MAX_POSTS_PER_DAY = 10
const MIN_MINUTES_BETWEEN = 10
const DUPLICATE_THRESHOLD = 2

import { getPrisma } from './_lib/prisma.mjs'

export default endpoint({
  methods: ['POST'],
  auth: true,
  handler: async ({ req }) => {
    const prisma = getPrisma()
    const body = await req.json().catch(() => ({})) as { type?: string; customMessage?: string }
    const type = body.type || 'generic'
    const message = body.customMessage || `Post automatique type ${type}`
    const h = hash(message)
    const now = new Date()
    const start = new Date(); start.setHours(0,0,0,0)
    const end = new Date(); end.setHours(23,59,59,999)
    const [postsToday, lastPost, duplicateCount] = await Promise.all([
      prisma.facebookPostLog.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.facebookPostLog.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.facebookPostLog.count({ where: { duplicateHash: h } }),
    ])
    if (postsToday >= MAX_POSTS_PER_DAY) return { message: 'Limite quotidienne atteinte', code: 429 }
    if (lastPost) {
      const diffMin = (now.getTime() - lastPost.createdAt.getTime()) / 60000
      if (diffMin < MIN_MINUTES_BETWEEN) return { message: 'Trop tôt depuis le dernier post', code: 429 }
    }
    if (duplicateCount >= DUPLICATE_THRESHOLD) return { message: 'Message dupliqué trop fréquent', code: 409 }
    await prisma.facebookPostLog.create({ data: { type, message, duplicateHash: h } })
    return { message: 'Post enregistré (simulation)' }
  }
})

function hash(msg: string) { return crypto.createHash('sha256').update(msg).digest('hex').slice(0,32) }
