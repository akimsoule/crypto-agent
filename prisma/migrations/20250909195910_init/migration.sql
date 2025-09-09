-- CreateEnum
CREATE TYPE "public"."SnapshotType" AS ENUM ('HOURLY', 'DAILY', 'MANUAL', 'ROLLUP');

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
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "maxPositionSize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskTolerance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "riskMin" DOUBLE PRECISION,
    "riskMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "orderId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "clientOid" TEXT NOT NULL,
    "baseVolume" TEXT NOT NULL,
    "fee" TEXT DEFAULT '0',
    "priceAvg" TEXT NOT NULL,
    "quoteVolume" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "posSide" TEXT NOT NULL,
    "rawPayload" JSONB,
    "cTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "public"."Position" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "marginCoin" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "holdSide" TEXT NOT NULL,
    "marginSize" TEXT NOT NULL,
    "available" TEXT NOT NULL,
    "locked" TEXT NOT NULL,
    "openPriceAvg" TEXT NOT NULL,
    "marginMode" TEXT NOT NULL,
    "unrealizedPL" TEXT NOT NULL,
    "markPrice" TEXT NOT NULL,
    "leverage" TEXT NOT NULL,
    "rawPayload" JSONB,
    "cTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacebookToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CryptoGemProject" (
    "id" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "marketCap" DOUBLE PRECISION,
    "marketCapRank" INTEGER,
    "priceChangePercentage24h" DOUBLE PRECISION,
    "volume24h" DOUBLE PRECISION,
    "totalVolume" DOUBLE PRECISION,
    "circulatingSupply" DOUBLE PRECISION,
    "maxSupply" DOUBLE PRECISION,
    "ath" DOUBLE PRECISION,
    "athChangePercentage" DOUBLE PRECISION,
    "gemScore" DOUBLE PRECISION,
    "sentimentScore" DOUBLE PRECISION,
    "sentimentMentions" INTEGER,
    "sentimentPositiveRatio" DOUBLE PRECISION,
    "needsSentimentAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoGemProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CryptoGemState" (
    "id" TEXT NOT NULL,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoGemState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CryptoGemAlert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoGemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Snapshot" (
    "id" TEXT NOT NULL,
    "profileId" TEXT,
    "type" "public"."SnapshotType" NOT NULL DEFAULT 'MANUAL',
    "rangeStart" TIMESTAMP(3),
    "rangeEnd" TIMESTAMP(3),
    "orders" JSONB,
    "positions" JSONB,
    "metrics" JSONB,
    "totalOrders" INTEGER,
    "totalPositions" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."FacebookPostLog" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "duplicateHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookPostLog_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Position_symbol_idx" ON "public"."Position"("symbol");

-- CreateIndex
CREATE INDEX "Position_marginCoin_holdSide_idx" ON "public"."Position"("marginCoin", "holdSide");

-- CreateIndex
CREATE UNIQUE INDEX "Position_profileId_symbol_holdSide_key" ON "public"."Position"("profileId", "symbol", "holdSide");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoGemProject_coinId_key" ON "public"."CryptoGemProject"("coinId");

-- CreateIndex
CREATE INDEX "CryptoGemProject_gemScore_idx" ON "public"."CryptoGemProject"("gemScore");

-- CreateIndex
CREATE INDEX "CryptoGemProject_needsSentimentAnalysis_gemScore_idx" ON "public"."CryptoGemProject"("needsSentimentAnalysis", "gemScore");

-- CreateIndex
CREATE INDEX "CryptoGemProject_lastUpdated_idx" ON "public"."CryptoGemProject"("lastUpdated");

-- CreateIndex
CREATE INDEX "CryptoGemAlert_projectId_type_idx" ON "public"."CryptoGemAlert"("projectId", "type");

-- CreateIndex
CREATE INDEX "Snapshot_profileId_createdAt_idx" ON "public"."Snapshot"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "Snapshot_type_createdAt_idx" ON "public"."Snapshot"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Snapshot_createdAt_idx" ON "public"."Snapshot"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "public"."NewsletterSubscription"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_isActive_createdAt_idx" ON "public"."NewsletterSubscription"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSendLog_sentAt_idx" ON "public"."NewsletterSendLog"("sentAt");

-- CreateIndex
CREATE INDEX "NewsletterSendLog_status_idx" ON "public"."NewsletterSendLog"("status");

-- CreateIndex
CREATE INDEX "FacebookPostLog_createdAt_idx" ON "public"."FacebookPostLog"("createdAt");

-- CreateIndex
CREATE INDEX "FacebookPostLog_type_createdAt_idx" ON "public"."FacebookPostLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "FacebookPostLog_duplicateHash_idx" ON "public"."FacebookPostLog"("duplicateHash");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."InvestorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."InvestorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CryptoGemAlert" ADD CONSTRAINT "CryptoGemAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."CryptoGemProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Snapshot" ADD CONSTRAINT "Snapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."InvestorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsletterSendLog" ADD CONSTRAINT "NewsletterSendLog_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."NewsletterSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
