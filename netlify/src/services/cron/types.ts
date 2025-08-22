// Types communs pour les services cron
export interface CronExecutionResult {
  success: boolean;
  timestamp: string;
  runId: string;
  data?: Record<string, unknown>;
  summary?: {
    gemsFound?: number;
    alertsGenerated?: number;
    postsCreated?: number;
    emailsSent?: number;
    itemsDeleted?: number;
    spaceSaved?: string;
    gemsAnalyzed?: number;
    activeInvestors?: number;
    totalDecisions?: number;
    buyOrders?: number;
    sellOrders?: number;
    totalAmountInvested?: number;
    totalAmountSold?: number;
    // Monitoring
    estimatedSizeMB?: number;
    healthScore?: number;
    needsAlert?: boolean;
  };
  error?: string;
  duration?: number;
}

// Types pour les résultats de l'investisseur
export interface InvestorResult {
  investorName: string;
  investorType: string;
  decisionsCount: number;
  buyOrders: number;
  sellOrders: number;
  totalAmount: number;
  analysisTimeMs?: number; // Temps d'analyse en millisecondes
  error?: string;
}

export interface CleanupStats extends Record<string, unknown> {
  alertsDeleted: number;
  gemsDeleted: number;
  investmentsDeleted: number;
  portfolioSnapshotsDeleted: number;
  simulationRunsDeleted: number;
  totalSpaceSaved: string;
  errors: string[];
}
