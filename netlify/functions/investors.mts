import { endpoint } from './_lib/middleware.mts'

export default endpoint({
  methods: ['GET'],
  auth: false,
  handler: async ({ prisma }) => {
    const profiles = await prisma.investorProfile.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
    return profiles.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      riskTolerance: p.riskTolerance ?? 0,
      maxPositionSize: p.maxPositionSize ?? 0,
      holdingPeriod: 0,
      sellThreshold: 0,
      stopLoss: 0,
      sentimentWeight: 0,
      technicalWeight: 0,
      description: p.strategyName,
      initialBalance: p.initialBalance ?? 0,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      investments: [],
      portfolioSnapshots: [],
    }))
  }
})
