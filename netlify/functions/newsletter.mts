import { endpoint, json } from './_lib/middleware.mts'

export default endpoint({
  methods: ['GET','POST','DELETE'],
  auth: false, // POST/DELETE publics via logique interne; GET admin check manuel
  handler: async ({ req, prisma }) => {
    const url = new URL(req.url)
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({})) as any
      const email: string | undefined = body.email?.toLowerCase()
      if (!email) return json({ success: false, message: 'Email requis' }, 400)
      const existing = await prisma.newsletterSubscription.findUnique({ where: { email } })
      if (existing) {
        if (!existing.isActive) {
          await prisma.newsletterSubscription.update({ where: { email }, data: { isActive: true, updatedAt: new Date() } })
        }
        return { message: 'Déjà inscrit', data: existing }
      }
      const created = await prisma.newsletterSubscription.create({ data: { email, source: (body as any).source || 'web', preferences: body.preferences || {} } })
      return { message: 'Inscription réussie', data: created }
    }
    if (req.method === 'DELETE') {
      const email = url.searchParams.get('email')?.toLowerCase()
      if (!email) return json({ success: false, message: 'Email requis' }, 400)
      const sub = await prisma.newsletterSubscription.findUnique({ where: { email } })
      if (!sub) return json({ success: false, message: 'Non trouvé' }, 404)
      await prisma.newsletterSubscription.update({ where: { email }, data: { isActive: false } })
      return { message: 'Désabonnement effectué' }
    }
    // GET (uniquement pages admin -> exige header Authorization si rôle admin)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!authHeader) {
      return json({ success: false, message: 'Non autorisé' }, 401)
    }
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const active = url.searchParams.get('active') === 'true'
    const where = active ? { isActive: true } : {}
    const [total, subs] = await Promise.all([
      prisma.newsletterSubscription.count({ where }),
      prisma.newsletterSubscription.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } })
    ])
    return { subscriptions: subs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }
})
