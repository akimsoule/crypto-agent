-- CreateTable
CREATE TABLE "crypto_gem_projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "coinId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentPrice" REAL NOT NULL,
    "marketCap" REAL NOT NULL,
    "marketCapRank" INTEGER NOT NULL,
    "priceChangePercentage24h" REAL NOT NULL,
    "volume24h" REAL NOT NULL,
    "totalVolume" REAL NOT NULL,
    "circulatingSupply" REAL NOT NULL,
    "maxSupply" REAL,
    "ath" REAL NOT NULL,
    "athChangePercentage" REAL NOT NULL,
    "gemScore" REAL,
    "sentimentScore" REAL,
    "sentimentMentions" INTEGER,
    "sentimentPositiveRatio" REAL,
    "needsSentimentAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnalyzed" DATETIME,
    "lastTelegramSent" DATETIME
);

-- CreateTable
CREATE TABLE "crypto_gem_alerts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "crypto_gem_states" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "currentPage" INTEGER NOT NULL DEFAULT 1,
    "maxPages" INTEGER NOT NULL DEFAULT 20,
    "batchSize" INTEGER NOT NULL DEFAULT 100,
    "lastCycleStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFullAnalysis" DATETIME,
    "processPhase" TEXT NOT NULL DEFAULT 'FETCH',
    "isProcessing" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "investor_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "riskTolerance" REAL NOT NULL,
    "maxPositionSize" REAL NOT NULL,
    "holdingPeriod" INTEGER NOT NULL,
    "sellThreshold" REAL NOT NULL,
    "stopLoss" REAL NOT NULL,
    "sentimentWeight" REAL NOT NULL,
    "technicalWeight" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "initialBalance" REAL NOT NULL DEFAULT 10000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "crypto_investments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "investorId" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "price" REAL NOT NULL,
    "quantity" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "gemScore" REAL,
    "sentiment" REAL,
    "expectedHoldDays" INTEGER NOT NULL,
    "targetProfit" REAL,
    "stopLoss" REAL,
    "marketType" TEXT NOT NULL DEFAULT 'SPOT',
    "isExecuted" BOOLEAN NOT NULL DEFAULT true,
    "executionPrice" REAL,
    "fees" REAL,
    "notes" TEXT,
    CONSTRAINT "crypto_investments_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "investor_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "crypto_investments_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "crypto_gem_projects" ("coinId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "crypto_portfolio_snapshots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "investorId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalValue" REAL NOT NULL,
    "cashBalance" REAL NOT NULL,
    "totalReturn" REAL NOT NULL,
    "totalReturnPercent" REAL NOT NULL,
    "winRate" REAL NOT NULL,
    "avgWinPercent" REAL NOT NULL,
    "avgLossPercent" REAL NOT NULL,
    "maxDrawdown" REAL NOT NULL,
    "totalTrades" INTEGER NOT NULL,
    "winningTrades" INTEGER NOT NULL,
    "losingTrades" INTEGER NOT NULL,
    "activePositions" INTEGER NOT NULL,
    CONSTRAINT "crypto_portfolio_snapshots_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "investor_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "crypto_positions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "coinId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "avgBuyPrice" REAL NOT NULL,
    "currentPrice" REAL NOT NULL,
    "unrealizedPnL" REAL NOT NULL,
    "unrealizedPnLPercent" REAL NOT NULL,
    "daysSinceEntry" INTEGER NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crypto_positions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "crypto_portfolio_snapshots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "crypto_simulation_runs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gemsAnalyzed" INTEGER NOT NULL,
    "totalInvestments" INTEGER NOT NULL,
    "totalBuyOrders" INTEGER NOT NULL,
    "totalSellOrders" INTEGER NOT NULL,
    "totalAmountInvested" REAL NOT NULL,
    "totalAmountSold" REAL NOT NULL,
    "activeInvestors" INTEGER NOT NULL,
    "bestPerformerName" TEXT,
    "bestPerformerReturn" REAL,
    "worstPerformerName" TEXT,
    "worstPerformerReturn" REAL,
    "avgReturnAllInvestors" REAL,
    "simulationType" TEXT NOT NULL DEFAULT 'STANDARD',
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "crypto_daily_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "totalSimulations" INTEGER NOT NULL DEFAULT 0,
    "totalInvestments" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" REAL NOT NULL DEFAULT 0,
    "avgGemsPerSimulation" REAL NOT NULL DEFAULT 0,
    "topPerformingCoin" TEXT,
    "topPerformingGain" REAL,
    "mostTradedCoin" TEXT,
    "mostTradedVolume" REAL,
    "bestInvestor" TEXT,
    "bestInvestorReturn" REAL
);

-- CreateTable
CREATE TABLE "crypto_social_signals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "signalType" TEXT NOT NULL,
    "investorId" TEXT,
    "coinId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hashtags" TEXT,
    "sentiment" TEXT NOT NULL,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "platforms" TEXT,
    "performanceMetrics" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "crypto_system_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "crypto_gem_projects_coinId_key" ON "crypto_gem_projects"("coinId");

-- CreateIndex
CREATE INDEX "crypto_investments_investorId_idx" ON "crypto_investments"("investorId");

-- CreateIndex
CREATE INDEX "crypto_investments_coinId_idx" ON "crypto_investments"("coinId");

-- CreateIndex
CREATE INDEX "crypto_investments_timestamp_idx" ON "crypto_investments"("timestamp");

-- CreateIndex
CREATE INDEX "crypto_portfolio_snapshots_investorId_idx" ON "crypto_portfolio_snapshots"("investorId");

-- CreateIndex
CREATE INDEX "crypto_portfolio_snapshots_timestamp_idx" ON "crypto_portfolio_snapshots"("timestamp");

-- CreateIndex
CREATE INDEX "crypto_positions_snapshotId_idx" ON "crypto_positions"("snapshotId");

-- CreateIndex
CREATE INDEX "crypto_positions_coinId_idx" ON "crypto_positions"("coinId");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_simulation_runs_runId_key" ON "crypto_simulation_runs"("runId");

-- CreateIndex
CREATE INDEX "crypto_simulation_runs_timestamp_idx" ON "crypto_simulation_runs"("timestamp");

-- CreateIndex
CREATE INDEX "crypto_simulation_runs_runId_idx" ON "crypto_simulation_runs"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_daily_stats_date_key" ON "crypto_daily_stats"("date");

-- CreateIndex
CREATE INDEX "crypto_daily_stats_date_idx" ON "crypto_daily_stats"("date");

-- CreateIndex
CREATE INDEX "crypto_social_signals_signalType_idx" ON "crypto_social_signals"("signalType");

-- CreateIndex
CREATE INDEX "crypto_social_signals_isPublished_idx" ON "crypto_social_signals"("isPublished");

-- CreateIndex
CREATE INDEX "crypto_social_signals_createdAt_idx" ON "crypto_social_signals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_system_configs_configKey_key" ON "crypto_system_configs"("configKey");
