import { PrismaClient } from '@prisma/client'

// Réutilisation d'une instance unique pour réduire le cold start
// (Netlify garde le process vivant un court instant entre les invocations)
let prisma: PrismaClient | undefined

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma as any
}

// Helper types (loose) avant regeneration du client
export type AnyPrisma = ReturnType<typeof getPrisma>

export type { Prisma, InvestorProfile } from '@prisma/client'
