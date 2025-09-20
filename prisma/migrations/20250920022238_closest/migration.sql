/*
  Warnings:

  - You are about to drop the `Position` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."HoldSide" AS ENUM ('long', 'short');

-- DropForeignKey
ALTER TABLE "public"."Position" DROP CONSTRAINT "Position_profileId_fkey";

-- DropTable
DROP TABLE "public"."Position";

-- CreateTable
CREATE TABLE "public"."ClosedPosition" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "lastCloseOrderId" TEXT,
    "profileId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "holdSide" "public"."HoldSide" NOT NULL,
    "size" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "entryPrice" DECIMAL(65,30),
    "exitPrice" DECIMAL(65,30),
    "entryNotional" DECIMAL(65,30),
    "exitNotional" DECIMAL(65,30),
    "grossPnl" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "feesOpenUsed" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "feesClose" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "realizedPnl" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "exchange" TEXT,
    "marginCoin" TEXT,
    "marginMode" TEXT,
    "leverage" INTEGER,
    "entryOrderCount" INTEGER,
    "closeOrderCount" INTEGER,
    "metadata" JSONB,
    "cTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosedPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClosedPosition_lastCloseOrderId_key" ON "public"."ClosedPosition"("lastCloseOrderId");

-- CreateIndex
CREATE INDEX "ClosedPosition_profileId_symbol_openedAt_idx" ON "public"."ClosedPosition"("profileId", "symbol", "openedAt");

-- AddForeignKey
ALTER TABLE "public"."ClosedPosition" ADD CONSTRAINT "ClosedPosition_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."InvestorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
