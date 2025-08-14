import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const handler = async (event: any) => {
  try {
    const { id } = event.queryStringParameters || {}
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) }
    }

    const investor = await prisma.investorProfile.findUnique({
      where: { id },
      include: {
        investments: { orderBy: { timestamp: 'desc' } },
        portfolioSnapshots: { orderBy: { timestamp: 'desc' } },
      },
    })

    if (!investor) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(investor),
    }
  } catch (error: any) {
    console.error('Error fetching investor', error)
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal error' }) }
  } finally {
    await prisma.$disconnect()
  }
}
