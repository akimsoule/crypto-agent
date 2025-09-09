-- CreateTable
CREATE TABLE "public"."InvestorSymbolExecution" (
    "profileId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "lastExecutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorSymbolExecution_pkey" PRIMARY KEY ("profileId","symbol")
);

-- CreateIndex
CREATE INDEX "InvestorSymbolExecution_lastExecutedAt_idx" ON "public"."InvestorSymbolExecution"("lastExecutedAt");

-- CreateIndex
CREATE INDEX "InvestorSymbolExecution_symbol_lastExecutedAt_idx" ON "public"."InvestorSymbolExecution"("symbol", "lastExecutedAt");

-- AddForeignKey
ALTER TABLE "public"."InvestorSymbolExecution" ADD CONSTRAINT "InvestorSymbolExecution_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."InvestorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
