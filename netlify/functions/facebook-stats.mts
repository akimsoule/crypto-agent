import { endpoint } from './_lib/middleware.mts'

// Endpoint: GET /api/facebook-stats
// Retourne un petit état de quota basé sur logs.

export default endpoint({
  methods: ['GET'],
  auth: true,
  handler: async ({ prisma }) => {
    const start = new Date(); start.setHours(0,0,0,0)
    const end = new Date(); end.setHours(23,59,59,999)
    const postsToday = await prisma.facebookPostLog.count({ where: { createdAt: { gte: start, lte: end } } })
    const lastPost = await prisma.facebookPostLog.findFirst({ orderBy: { createdAt: 'desc' } })
    return {
      postsToday,
      maxPostsPerDay: 10,
      lastPostTime: lastPost?.createdAt ?? null,
      minTimeBetweenPosts: 10,
      duplicateThreshold: 2,
    }
  }
})
