// Point d'entrée pour toutes les tâches cron
export * from './types';
export { executeGemHunter } from './executeGemHunter';
export { executeFacebookPosts } from './executeFacebookPosts';
export { executeNewsletter } from './executeNewsletter';
export { executeCleanup } from './executeCleanup';
export { executeInvestorWatch } from './executeInvestorWatch';
export { executeMonitoring } from './executeMonitoring';

// Classe CronService simplifiée qui utilise les fonctions modulaires
import { PrismaClient } from "@prisma/client";
import { executeGemHunter } from './executeGemHunter';
import { executeFacebookPosts } from './executeFacebookPosts';
import { executeNewsletter } from './executeNewsletter';
import { executeCleanup } from './executeCleanup';
import { executeInvestorWatch } from './executeInvestorWatch';
import { executeMonitoring } from './executeMonitoring';
import type { CronExecutionResult } from './types';

export class CronService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Exécute la tâche de recherche de gems crypto
   */
  async executeGemHunter(): Promise<CronExecutionResult> {
    return executeGemHunter(this.prisma);
  }

  /**
   * Exécute l'envoi de posts Facebook
   */
  async executeFacebookPosts(): Promise<CronExecutionResult> {
    return executeFacebookPosts();
  }

  /**
   * Exécute l'envoi de newsletters
   */
  async executeNewsletter(): Promise<CronExecutionResult> {
    return executeNewsletter();
  }

  /**
   * Nettoyage des données anciennes
   */
  async executeCleanup(): Promise<CronExecutionResult> {
    return executeCleanup(this.prisma);
  }

  /**
   * Exécute la surveillance des investisseurs
   */
  async executeInvestorWatch(): Promise<CronExecutionResult> {
    return executeInvestorWatch(this.prisma);
  }

  /**
   * Exécute la surveillance et maintenance du système
   */
  async executeMonitoring(): Promise<CronExecutionResult> {
    return executeMonitoring(this.prisma);
  }
}
