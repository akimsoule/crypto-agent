import jwt from 'jsonwebtoken'

export interface AuthUser { id: string; username: string; role: string }

export function verifyBearer(req: Request): { ok: boolean; user?: AuthUser; problem?: string } {
  const secret = process.env.JWT_SECRET
  if (!secret) return { ok: false, problem: 'Missing JWT_SECRET' }
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return { ok: false, problem: 'No bearer token' }
  const token = auth.slice('Bearer '.length).trim()
  try {
    const decoded = jwt.verify(token, secret) as { sub: string; username: string; role?: string }
    return { ok: true, user: { id: decoded.sub, username: decoded.username, role: decoded.role || 'user' } }
  } catch {
    return { ok: false, problem: 'Invalid token' }
  }
}
