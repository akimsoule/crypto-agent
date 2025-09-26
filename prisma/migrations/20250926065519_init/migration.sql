-- CreateEnum
CREATE TYPE "public"."HoldSide" AS ENUM ('long', 'short');

-- CreateTable
CREATE TABLE "public"."InvestorProfile" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'generic',
    "name" TEXT NOT NULL,
    "symbols" TEXT[],
    "strategy_name" TEXT NOT NULL,
    "filter" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "position" TEXT,
    "leverage" INTEGER NOT NULL,
    "marginMode" TEXT NOT NULL,
    "exit" BOOLEAN,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "initialBalance" DECIMAL(65,30) NOT NULL DEFAULT 10000,
    "maxPositionSize" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "riskTolerance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "riskMin" DECIMAL(65,30),
    "riskMax" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "orderId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "size" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "clientOid" TEXT NOT NULL,
    "baseVolume" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "priceAvg" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "quoteVolume" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "side" TEXT NOT NULL,
    "posSide" TEXT NOT NULL,
    "rawPayload" JSONB,
    "cTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "public"."FacebookToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterSubscription" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT DEFAULT 'web',
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEmailSent" TIMESTAMP(3),
    "emailsSent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterSendLog" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "error" TEXT,

    CONSTRAINT "NewsletterSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvestorSymbolExecution" (
    "profileId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "lastExecutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorSymbolExecution_pkey" PRIMARY KEY ("profileId","symbol")
);

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
CREATE UNIQUE INDEX "InvestorProfile_name_key" ON "public"."InvestorProfile"("name");

-- CreateIndex
CREATE INDEX "InvestorProfile_isActive_strategy_name_idx" ON "public"."InvestorProfile"("isActive", "strategy_name");

-- CreateIndex
CREATE INDEX "Order_clientOid_idx" ON "public"."Order"("clientOid");

-- CreateIndex
CREATE INDEX "Order_symbol_idx" ON "public"."Order"("symbol");

-- CreateIndex
CREATE INDEX "Order_cTime_uTime_idx" ON "public"."Order"("cTime", "uTime");

-- CreateIndex
CREATE INDEX "Order_profileId_symbol_cTime_idx" ON "public"."Order"("profileId", "symbol", "cTime");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "public"."NewsletterSubscription"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_isActive_createdAt_idx" ON "public"."NewsletterSubscription"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSendLog_sentAt_idx" ON "public"."NewsletterSendLog"("sentAt");

-- CreateIndex
CREATE INDEX "NewsletterSendLog_status_idx" ON "public"."NewsletterSendLog"("status");

-- CreateIndex
CREATE INDEX "InvestorSymbolExecution_lastExecutedAt_idx" ON "public"."InvestorSymbolExecution"("lastExecutedAt");

-- CreateIndex
CREATE INDEX "InvestorSymbolExecution_symbol_lastExecutedAt_idx" ON "public"."InvestorSymbolExecution"("symbol", "lastExecutedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClosedPosition_lastCloseOrderId_key" ON "public"."ClosedPosition"("lastCloseOrderId");

-- CreateIndex
CREATE INDEX "ClosedPosition_profileId_symbol_openedAt_idx" ON "public"."ClosedPosition"("profileId", "symbol", "openedAt");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."InvestorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsletterSendLog" ADD CONSTRAINT "NewsletterSendLog_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."NewsletterSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvestorSymbolExecution" ADD CONSTRAINT "InvestorSymbolExecution_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."InvestorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClosedPosition" ADD CONSTRAINT "ClosedPosition_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."InvestorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
