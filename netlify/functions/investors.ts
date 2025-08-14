import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const handler = async () => {
  try {
    const investors = await prisma.investorProfile.findMany({
      where: { isActive: true },
      include: {
        investments: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
        portfolioSnapshots: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(investors),
    }
  } catch (error: any) {
    console.error('Error fetching investors', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal error' }),
    }
  } finally {
    await prisma.$disconnect()
  }
}
