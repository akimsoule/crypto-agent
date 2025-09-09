import jwt from 'jsonwebtoken'
import { endpoint, json } from './_lib/middleware.mts'

export default endpoint({
  methods: ['GET'],
  auth: false,
  handler: async ({ req }) => {
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      return json({ success: false, error: 'JWT_SECRET manquant côté serveur' }, 500)
    }
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false }
    }
    const token = authHeader.slice('Bearer '.length).trim()
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; username: string; role?: string }
      return { valid: true, user: { id: decoded.sub, username: decoded.username, role: decoded.role || 'user' } }
    } catch {
      return { valid: false }
    }
  }
})
