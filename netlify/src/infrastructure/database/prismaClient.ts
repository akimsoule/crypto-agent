import { PrismaClient } from "@prisma/client";
// Define GlobalWithPrisma type inline since '../../types/prisma' is missing
type GlobalWithPrisma = typeof globalThis & { __prisma?: PrismaClient };

const globalForPrisma = globalThis as GlobalWithPrisma;
const prisma: PrismaClient = globalForPrisma.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;

export default prisma;
