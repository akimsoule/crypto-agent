-- CreateTable
CREATE TABLE "public"."crypto_gem_projects" (
    "id" SERIAL NOT NULL,
    "coinId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "marketCap" DOUBLE PRECISION NOT NULL,
    "marketCapRank" INTEGER NOT NULL,
    "priceChangePercentage24h" DOUBLE PRECISION NOT NULL,
    "volume24h" DOUBLE PRECISION NOT NULL,
    "totalVolume" DOUBLE PRECISION NOT NULL,
    "circulatingSupply" DOUBLE PRECISION NOT NULL,
    "maxSupply" DOUBLE PRECISION,
    "ath" DOUBLE PRECISION NOT NULL,
    "athChangePercentage" DOUBLE PRECISION NOT NULL,
    "gemScore" DOUBLE PRECISION,
    "sentimentScore" DOUBLE PRECISION,
    "sentimentMentions" INTEGER,
    "sentimentPositiveRatio" DOUBLE PRECISION,
    "needsSentimentAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnalyzed" TIMESTAMP(3),
    "lastTelegramSent" TIMESTAMP(3),

    CONSTRAINT "crypto_gem_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crypto_gem_alerts" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crypto_gem_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crypto_gem_states" (
    "id" SERIAL NOT NULL,
    "currentPage" INTEGER NOT NULL DEFAULT 1,
    "maxPages" INTEGER NOT NULL DEFAULT 20,
    "batchSize" INTEGER NOT NULL DEFAULT 100,
    "lastCycleStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFullAnalysis" TIMESTAMP(3),
    "processPhase" TEXT NOT NULL DEFAULT 'FETCH',
    "isProcessing" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "crypto_gem_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."investor_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "riskTolerance" DOUBLE PRECISION NOT NULL,
    "maxPositionSize" DOUBLE PRECISION NOT NULL,
    "holdingPeriod" INTEGER NOT NULL,
    "sellThreshold" DOUBLE PRECISION NOT NULL,
    "stopLoss" DOUBLE PRECISION NOT NULL,
    "sentimentWeight" DOUBLE PRECISION NOT NULL,
    "technicalWeight" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crypto_investments" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "gemScore" DOUBLE PRECISION,
    "sentiment" DOUBLE PRECISION,
    "expectedHoldDays" INTEGER NOT NULL,
    "targetProfit" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION,
    "marketType" TEXT NOT NULL DEFAULT 'SPOT',
    "isExecuted" BOOLEAN NOT NULL DEFAULT true,
    "executionPrice" DOUBLE PRECISION,
    "fees" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "crypto_investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crypto_portfolio_snapshots" (
    "id" SERIAL NOT NULL,
    "investorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "cashBalance" DOUBLE PRECISION NOT NULL,
    "totalReturn" DOUBLE PRECISION NOT NULL,
    "totalReturnPercent" DOUBLE PRECISION NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "avgWinPercent" DOUBLE PRECISION NOT NULL,
    "avgLossPercent" DOUBLE PRECISION NOT NULL,
    "maxDrawdown" DOUBLE PRECISION NOT NULL,
    "totalTrades" INTEGER NOT NULL,
    "winningTrades" INTEGER NOT NULL,
    "losingTrades" INTEGER NOT NULL,
    "activePositions" INTEGER NOT NULL,

    CONSTRAINT "crypto_portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crypto_positions" (
    "id" SERIAL NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "coinId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "avgBuyPrice" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "unrealizedPnL" DOUBLE PRECISION NOT NULL,
    "unrealizedPnLPercent" DOUBLE PRECISION NOT NULL,
    "daysSinceEntry" INTEGER NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crypto_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crypto_simulation_runs" (
    "id" SERIAL NOT NULL,
    "runId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gemsAnalyzed" INTEGER NOT NULL,
    "totalInvestments" INTEGER NOT NULL,
    "totalBuyOrders" INTEGER NOT NULL,
    "totalSellOrders" INTEGER NOT NULL,
    "totalAmountInvested" DOUBLE PRECISION NOT NULL,
    "totalAmountSold" DOUBLE PRECISION NOT NULL,
    "activeInvestors" INTEGER NOT NULL,
    "bestPerformerName" TEXT,
    "bestPerformerReturn" DOUBLE PRECISION,
    "worstPerformerName" TEXT,
    "worstPerformerReturn" DOUBLE PRECISION,
    "avgReturnAllInvestors" DOUBLE PRECISION,
    "simulationType" TEXT NOT NULL DEFAULT 'STANDARD',
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,

    CONSTRAINT "crypto_simulation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crypto_daily_stats" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalSimulations" INTEGER NOT NULL DEFAULT 0,
    "totalInvestments" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgGemsPerSimulation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topPerformingCoin" TEXT,
    "topPerformingGain" DOUBLE PRECISION,
    "mostTradedCoin" TEXT,
    "mostTradedVolume" DOUBLE PRECISION,
    "bestInvestor" TEXT,
    "bestInvestorReturn" DOUBLE PRECISION,

    CONSTRAINT "crypto_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crypto_social_signals" (
    "id" SERIAL NOT NULL,
    "signalType" TEXT NOT NULL,
    "investorId" TEXT,
    "coinId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hashtags" TEXT,
    "sentiment" TEXT NOT NULL,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "platforms" TEXT,
    "performanceMetrics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_social_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crypto_system_configs" (
    "id" SERIAL NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crypto_gem_projects_coinId_key" ON "public"."crypto_gem_projects"("coinId");

-- CreateIndex
CREATE INDEX "crypto_investments_investorId_idx" ON "public"."crypto_investments"("investorId");

-- CreateIndex
CREATE INDEX "crypto_investments_coinId_idx" ON "public"."crypto_investments"("coinId");

-- CreateIndex
CREATE INDEX "crypto_investments_timestamp_idx" ON "public"."crypto_investments"("timestamp");

-- CreateIndex
CREATE INDEX "crypto_portfolio_snapshots_investorId_idx" ON "public"."crypto_portfolio_snapshots"("investorId");

-- CreateIndex
CREATE INDEX "crypto_portfolio_snapshots_timestamp_idx" ON "public"."crypto_portfolio_snapshots"("timestamp");

-- CreateIndex
CREATE INDEX "crypto_positions_snapshotId_idx" ON "public"."crypto_positions"("snapshotId");

-- CreateIndex
CREATE INDEX "crypto_positions_coinId_idx" ON "public"."crypto_positions"("coinId");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_simulation_runs_runId_key" ON "public"."crypto_simulation_runs"("runId");

-- CreateIndex
CREATE INDEX "crypto_simulation_runs_timestamp_idx" ON "public"."crypto_simulation_runs"("timestamp");

-- CreateIndex
CREATE INDEX "crypto_simulation_runs_runId_idx" ON "public"."crypto_simulation_runs"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_daily_stats_date_key" ON "public"."crypto_daily_stats"("date");

-- CreateIndex
CREATE INDEX "crypto_daily_stats_date_idx" ON "public"."crypto_daily_stats"("date");

-- CreateIndex
CREATE INDEX "crypto_social_signals_signalType_idx" ON "public"."crypto_social_signals"("signalType");

-- CreateIndex
CREATE INDEX "crypto_social_signals_isPublished_idx" ON "public"."crypto_social_signals"("isPublished");

-- CreateIndex
CREATE INDEX "crypto_social_signals_createdAt_idx" ON "public"."crypto_social_signals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_system_configs_configKey_key" ON "public"."crypto_system_configs"("configKey");

-- AddForeignKey
ALTER TABLE "public"."crypto_investments" ADD CONSTRAINT "crypto_investments_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "public"."investor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crypto_investments" ADD CONSTRAINT "crypto_investments_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "public"."crypto_gem_projects"("coinId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crypto_portfolio_snapshots" ADD CONSTRAINT "crypto_portfolio_snapshots_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "public"."investor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crypto_positions" ADD CONSTRAINT "crypto_positions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "public"."crypto_portfolio_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
