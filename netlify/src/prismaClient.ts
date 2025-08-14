import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as any;
const prisma: PrismaClient = globalForPrisma.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;

export default prisma;
