import { endpoint } from './_lib/middleware.mts'

// Endpoint: POST /api/newsletter-send
// Simule l'envoi d'une newsletter (placeholder). Met à jour counters + logs.

export default endpoint({
  methods: ['POST'],
  auth: true,
  roles: ['admin'],
  handler: async ({ prisma, user }) => {
    const activeSubs = await prisma.newsletterSubscription.findMany({ where: { isActive: true } })
    let sent = 0; let failed = 0
    for (const sub of activeSubs) {
      try {
        await prisma.newsletterSendLog.create({ data: { subscriptionId: sub.id, status: 'SENT' } })
        await prisma.newsletterSubscription.update({ where: { id: sub.id }, data: { emailsSent: { increment: 1 }, lastEmailSent: new Date() } })
        sent++
      } catch {
        failed++
      }
    }
    return { message: 'Newsletter envoyée', stats: { sent, failed, by: user?.username } }
  }
})
