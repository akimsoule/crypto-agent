// Types liés à Prisma et à la base de données
import type { PrismaClient } from "@prisma/client";

export interface GlobalWithPrisma {
  __prisma?: PrismaClient;
}
