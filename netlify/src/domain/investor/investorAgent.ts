import prisma from "../../infrastructure/database/prismaClient";
import { CryptoProject } from "../../../../types/crypto";
import {
  Investment,
  Portfolio,
  Position,
  Trade,
} from '../../../../types/investor';
import { InvestorProfile, PrismaClient } from "@prisma/client";

export class InvestorAgent {
  private prisma: PrismaClient;
  private profile: InvestorProfile;
  private portfolio: Portfolio;
  private initialBalance: number = 10000; // $10k par défaut

  constructor(profile: InvestorProfile) {
    this.prisma = prisma;
    this.profile = profile;
    this.portfolio = {
      id: 0, // Sera généré par la base de données
      investorId: profile.id,
      timestamp: new Date(),
      totalValue: this.initialBalance,
      cashBalance: this.initialBalance,
      totalReturn: 0,
      totalReturnPercent: 0,
      winRate: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      maxDrawdown: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      activePositions: 0,
      positions: [],
    };
  }

  // Méthode principale pour analyser et prendre des décisions
  async analyzeAndAct(gems: CryptoProject[]): Promise<Investment[]> {
    console.log(`🤖 ${this.profile.name} analyse ${gems.length} gems...`);

    await this.updatePortfolio(gems);
    const investments: Investment[] = [];

    // 1. Vérifier les positions existantes pour les ventes
    const sellDecisions = await this.evaluateExistingPositions();
    investments.push(...sellDecisions);

    // 2. Évaluer les nouveaux achats potentiels
    const buyDecisions = await this.evaluateNewInvestments(gems);
    investments.push(...buyDecisions);

    // 3. Sauvegarder les décisions
    for (const investment of investments) {
      await this.saveInvestment(investment);
    }

    return investments;
  }

  private async evaluateExistingPositions(): Promise<Investment[]> {
    const decisions: Investment[] = [];

    for (const position of this.portfolio.positions) {
      const decision = this.shouldSell(position);

      if (decision.shouldSell) {
        // Vérifier le cooldown pour éviter les ventes répétitives
        const cooldownCheck = await this.isTokenInCooldown(position.coinId, 'SELL');
        if (cooldownCheck.inCooldown) {
          console.log(`${this.profile.name}: ${cooldownCheck.reason} - vente annulée`);
          continue; // Passer à la position suivante
        }

        const sellInvestment: Investment = {
          id: this.generateId(),
          investorId: this.profile.id,
          coinId: position.coinId,
          symbol: position.symbol,
          name: position.name,
          action: "SELL",
          amount: position.quantity * position.currentPrice,
          price: position.currentPrice,
          quantity: position.quantity,
          timestamp: new Date(),
          reason: decision.reason,
          gemScore: null,
          sentiment: null,
          expectedHoldDays: 0,
          targetProfit: null,
          stopLoss: null,
          marketType: "SPOT",
          isExecuted: true,
          executionPrice: position.currentPrice,
          fees: null,
          notes: null,
        };

        decisions.push(sellInvestment);

        // Mettre à jour le portefeuille
        this.portfolio.cashBalance += sellInvestment.amount;
        this.portfolio.positions = this.portfolio.positions.filter(
          (p) => p.coinId !== position.coinId
        );
      }
    }

    return decisions;
  }

  private shouldSell(position: Position): {
    shouldSell: boolean;
    reason: string;
  } {
    // Logique de vente basée sur le profil
    const profitPercent = position.unrealizedPnLPercent;
    const daysSinceEntry = position.daysSinceEntry;

    // Stop Loss
    if (profitPercent <= -this.profile.stopLoss) {
      return {
        shouldSell: true,
        reason: `Stop Loss atteint: ${profitPercent.toFixed(2)}%`,
      };
    }

    // Take Profit
    if (profitPercent >= this.profile.sellThreshold) {
      return {
        shouldSell: true,
        reason: `Objectif de profit atteint: ${profitPercent.toFixed(2)}%`,
      };
    }

    // Période de détention dépassée
    if (daysSinceEntry >= this.profile.holdingPeriod) {
      return {
        shouldSell: true,
        reason: `Période de détention dépassée: ${daysSinceEntry} jours`,
      };
    }

    // Logique spécifique par type d'investisseur
    switch (this.profile.type) {
      case "aggressive":
        // Vendre rapidement si perte > 15% ou gain > 25%
        if (profitPercent <= -15 || profitPercent >= 25) {
          return {
            shouldSell: true,
            reason: `Stratégie agressive: ${profitPercent.toFixed(2)}%`,
          };
        }
        break;

      case "conservative":
        // Vendre dès 10% de profit ou 8% de perte
        if (profitPercent >= 10 || profitPercent <= -8) {
          return {
            shouldSell: true,
            reason: `Stratégie conservatrice: ${profitPercent.toFixed(2)}%`,
          };
        }
        break;

      case "momentum":
        // Vendre si le momentum se retourne (logique simplifiée)
        if (daysSinceEntry >= 3 && profitPercent < 0) {
          return {
            shouldSell: true,
            reason: `Perte de momentum: ${profitPercent.toFixed(2)}%`,
          };
        }
        break;
    }

    return { shouldSell: false, reason: "" };
  }

  private async evaluateNewInvestments(
    gems: CryptoProject[]
  ): Promise<Investment[]> {
    const decisions: Investment[] = [];
    // availableCash is checked dynamically as we allocate multiple positions
    const maxPositionValue =
      (this.portfolio.totalValue * this.profile.maxPositionSize) / 100;

    // Filtrer et scorer les gems selon le profil
    const scoredGems = gems
      .map((gem) => ({
        ...gem,
        investorScore: this.calculateInvestorScore(gem),
      }))
      .filter((gem) => gem.investorScore >= this.getMinimumScore())
      .sort((a, b) => b.investorScore - a.investorScore);

    console.log(
      `${this.profile.name}: ${scoredGems.length} gems passent les critères`
    );

    // Sélectionner les meilleures opportunités
    const selectedGems = scoredGems.slice(0, this.getMaxNewPositions());

    for (const gem of selectedGems) {
      const availableCash = this.portfolio.cashBalance;
      if (availableCash < 100) break; // Minimum $100 pour investir

      const shouldBuy = await this.shouldBuy(gem);

      if (shouldBuy.shouldBuy) {
        const investmentAmount = Math.min(
          maxPositionValue,
          availableCash * this.getAllocationPercent(gem)
        );
        const quantity = investmentAmount / gem.current_price;

        const buyInvestment: Investment = {
          id: this.generateId(),
          investorId: this.profile.id,
          coinId: gem.id,
          symbol: gem.symbol,
          name: gem.name,
          action: "BUY",
          amount: investmentAmount,
          price: gem.current_price,
          quantity: quantity,
          timestamp: new Date(),
          reason: shouldBuy.reason,
          gemScore: gem.gemScore ?? null,
          sentiment: gem.socialSentiment?.score ?? null,
          expectedHoldDays: this.profile.holdingPeriod,
          targetProfit: this.profile.sellThreshold,
          stopLoss: this.profile.stopLoss,
          marketType: "SPOT",
          isExecuted: true,
          executionPrice: gem.current_price,
          fees: null,
          notes: null,
        };

        decisions.push(buyInvestment);

        // Mettre à jour le portefeuille
        this.portfolio.cashBalance -= investmentAmount;
        this.portfolio.positions.push({
          id: 0, // Ce sera généré par la base de données
          snapshotId: 0, // Ce sera assigné lors de la sauvegarde du snapshot
          coinId: gem.id,
          symbol: gem.symbol,
          name: gem.name,
          quantity: quantity,
          avgBuyPrice: gem.current_price,
          currentPrice: gem.current_price,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          daysSinceEntry: 0,
          lastUpdated: new Date(),
        });
      } else {
        // Log quand un achat est refusé pour comprendre pourquoi
        console.log(`${this.profile.name}: Achat refusé pour ${gem.symbol} - ${shouldBuy.reason}`);
      }
    }

    return decisions;
  }

  public calculateInvestorScore(gem: CryptoProject): number {
    let score = gem.gemScore || 0;

    // Ajustements selon le profil d'investisseur
    switch (this.profile.type) {
      case "conservative":
        // Favorise la stabilité et les projets établis
        if (gem.market_cap_rank <= 100) score += 20;
        if (gem.price_change_percentage_24h > 50) score -= 30; // Évite la volatilité extrême
        if (gem.market_cap > 50000000) score += 15; // Préfère les gros market caps
        break;

      case "aggressive":
        // Favorise le potentiel de croissance et la volatilité
        if (gem.price_change_percentage_24h > 30) score += 25;
        if (gem.market_cap < 10000000) score += 20; // Préfère les small caps
        if (gem.ath_change_percentage < -80) score += 30; // Très undervalued
        break;

      case "momentum": // Favorise les cryptos avec momentum positif
      {
        if (gem.price_change_percentage_24h > 15) score += 30;
        const volumeRatio = gem.total_volume / gem.market_cap;
        if (volumeRatio > 0.1) score += 25; // Volume élevé
        break;
      }

      case "contrarian":
        // Achète quand les autres vendent
        if (gem.price_change_percentage_24h < -20) score += 25;
        if (gem.socialSentiment && gem.socialSentiment.score < 0.3) score += 20;
        break;

      case "balanced":
        // Équilibre entre tous les facteurs
        if (gem.market_cap_rank <= 300) score += 10;
        if (
          gem.price_change_percentage_24h > 10 &&
          gem.price_change_percentage_24h < 40
        )
          score += 15;
        break;
    }

    // Facteur sentiment selon le profil
    if (gem.socialSentiment) {
      const sentimentBonus =
        (gem.socialSentiment.score - 0.5) * 20 * this.profile.sentimentWeight;
      score += sentimentBonus;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Nouvelle méthode pour vérifier si un token est en cooldown
  private async isTokenInCooldown(coinId: string, action: 'BUY' | 'SELL'): Promise<{ inCooldown: boolean; reason?: string }> {
    try {
      // Vérifier les transactions récentes (dernières 4 heures pour éviter les actions répétitives)
      const cooldownHours = 4;
      const cutoffTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
      
      // Vérifier aussi les transactions de la journée pour limiter la fréquence
      const todayCutoff = new Date();
      todayCutoff.setHours(0, 0, 0, 0); // Début de la journée

      const recentInvestments = await this.prisma.cryptoInvestment.findMany({
        where: {
          investorId: this.profile.id,
          coinId: coinId,
          timestamp: {
            gte: cutoffTime
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 5 // Vérifier les 5 dernières actions sur ce token
      });

      const todayInvestments = await this.prisma.cryptoInvestment.findMany({
        where: {
          investorId: this.profile.id,
          coinId: coinId,
          timestamp: {
            gte: todayCutoff
          }
        }
      });

      // Limite quotidienne : max 3 transactions par token par jour
      if (todayInvestments.length >= 3) {
        return { 
          inCooldown: true, 
          reason: `Limite quotidienne atteinte: ${todayInvestments.length} transactions sur ${coinId} aujourd'hui` 
        };
      }

      if (recentInvestments.length === 0) {
        return { inCooldown: false };
      }

      // Si la dernière action était la même que celle proposée, c'est suspect
      const lastAction = recentInvestments[0];
      if (lastAction.action === action) {
        const timeSinceLastAction = Date.now() - lastAction.timestamp.getTime();
        const hoursSince = timeSinceLastAction / (1000 * 60 * 60);
        
        if (hoursSince < cooldownHours) {
          return { 
            inCooldown: true, 
            reason: `Cooldown: ${action} sur ${coinId} il y a ${hoursSince.toFixed(1)}h` 
          };
        }
      }

      // Vérifier les patterns suspects (achat-vente-achat rapide)
      if (recentInvestments.length >= 2 && action === 'BUY') {
        const last = recentInvestments[0];
        const secondLast = recentInvestments[1];
        
        if (last.action === 'SELL' && secondLast.action === 'BUY') {
          const timeBetweenActions = last.timestamp.getTime() - secondLast.timestamp.getTime();
          const hoursBetween = timeBetweenActions / (1000 * 60 * 60);
          
          if (hoursBetween < 2) { // Achat-vente-achat en moins de 2h = suspect
            return { 
              inCooldown: true, 
              reason: `Pattern suspect: achat-vente-achat rapide sur ${coinId}` 
            };
          }
        }
      }

      // Vérifier si on fait trop de transactions sur le même token
      if (recentInvestments.length >= 3) {
        const firstTransaction = recentInvestments[recentInvestments.length - 1];
        const timeSpan = Date.now() - firstTransaction.timestamp.getTime();
        const hoursSpan = timeSpan / (1000 * 60 * 60);
        
        if (hoursSpan < 6) { // Plus de 3 transactions en moins de 6h = suspect
          return { 
            inCooldown: true, 
            reason: `Trop d'activité: ${recentInvestments.length} transactions sur ${coinId} en ${hoursSpan.toFixed(1)}h` 
          };
        }
      }

      return { inCooldown: false };
    } catch (error) {
      console.error(`Erreur lors de la vérification du cooldown pour ${coinId}:`, error);
      // En cas d'erreur, on n'applique pas de cooldown pour ne pas bloquer les transactions
      return { inCooldown: false };
    }
  }

  public async shouldBuy(gem: CryptoProject): Promise<{ shouldBuy: boolean; reason: string }> {
    // Vérifier si on a déjà cette crypto
    const existingPosition = this.portfolio.positions.find(
      (p) => p.coinId === gem.id
    );
    if (existingPosition) {
      return { shouldBuy: false, reason: "Position déjà existante" };
    }

    // Vérifier le cooldown pour éviter les actions répétitives
    const cooldownCheck = await this.isTokenInCooldown(gem.id, 'BUY');
    if (cooldownCheck.inCooldown) {
      return { shouldBuy: false, reason: cooldownCheck.reason || "Token en cooldown" };
    }

    // Vérifier les critères minimum
    if (gem.market_cap < 100000) {
      return { shouldBuy: false, reason: "Market cap trop faible" };
    }

    const investorScore = this.calculateInvestorScore(gem);
    const minScore = this.getMinimumScore();

    if (investorScore < minScore) {
      return {
        shouldBuy: false,
        reason: `Score insuffisant: ${investorScore}/${minScore}`,
      };
    }

    // Logique d'achat spécifique par profil
    const reason = `Score: ${investorScore}, Gem: ${
      gem.gemScore
    }, Prix: +${gem.price_change_percentage_24h.toFixed(2)}%`;
    return { shouldBuy: true, reason };
  }

  public getMinimumScore(): number {
    switch (this.profile.type) {
      case "conservative":
        return 60;
      case "balanced":
        return 50;
      case "aggressive":
        return 40;
      case "momentum":
        return 45;
      case "contrarian":
        return 35;
      default:
        return 50;
    }
  }

  public getMaxNewPositions(): number {
    switch (this.profile.type) {
      case "conservative":
        return 2;
      case "balanced":
        return 3;
      case "aggressive":
        return 5;
      case "momentum":
        return 4;
      case "contrarian":
        return 3;
      default:
        return 3;
    }
  }

  public getAllocationPercent(gem: CryptoProject): number {
    const baseAllocation = this.profile.maxPositionSize / 100;
    const riskAdjustment = this.profile.riskTolerance;

    // Ajuster selon le score de la gem
    const scoreMultiplier = ((gem.gemScore || 0) / 100) * 0.5 + 0.5;

    return baseAllocation * riskAdjustment * scoreMultiplier;
  }

  public async updatePortfolio(gems: CryptoProject[]): Promise<void> {
    // Mettre à jour les prix actuels des positions
    for (const position of this.portfolio.positions) {
      const currentGem = gems.find((g) => g.id === position.coinId);
      if (currentGem) {
        position.currentPrice = currentGem.current_price;
        position.unrealizedPnL =
          (position.currentPrice - position.avgBuyPrice) * position.quantity;
        position.unrealizedPnLPercent =
          ((position.currentPrice - position.avgBuyPrice) /
            position.avgBuyPrice) *
          100;
        position.daysSinceEntry = Math.floor(
          (Date.now() - position.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    // Calculer la valeur totale du portefeuille
    const positionsValue = this.portfolio.positions.reduce(
      (total, pos) => total + pos.currentPrice * pos.quantity,
      0
    );
    this.portfolio.totalValue = this.portfolio.cashBalance + positionsValue;

    // Mettre à jour les métriques de performance
    await this.updatePerformanceMetrics();
  }

  public async updatePerformanceMetrics(): Promise<void> {
    try {
      const investments = (await this.prisma.cryptoInvestment.findMany({
        where: { investorId: this.profile.id },
        orderBy: { timestamp: "asc" },
      })) as Investment[];

      const trades = this.calculateTrades(investments);

      // Mettre à jour directement les propriétés du portfolio
      this.portfolio.totalReturn =
        this.portfolio.totalValue - this.initialBalance;
      this.portfolio.totalReturnPercent =
        ((this.portfolio.totalValue - this.initialBalance) /
          this.initialBalance) *
        100;
      this.portfolio.winRate =
        trades.length > 0
          ? (trades.filter((t) => t.pnlPercent > 0).length / trades.length) *
            100
          : 0;
      this.portfolio.avgWinPercent = this.calculateAvgWin(trades);
      this.portfolio.avgLossPercent = this.calculateAvgLoss(trades);
      this.portfolio.maxDrawdown = this.calculateMaxDrawdown(investments);
      this.portfolio.totalTrades = trades.length;
      this.portfolio.winningTrades = trades.filter(
        (t) => t.pnlPercent > 0
      ).length;
      this.portfolio.losingTrades = trades.filter(
        (t) => t.pnlPercent <= 0
      ).length;
      this.portfolio.activePositions = this.portfolio.positions.length;
    } catch (error) {
      console.warn(`Erreur mise à jour métriques ${this.profile.name}:`, error);
    }
  }

  public calculateTrades(investments: Investment[]): Trade[] {
    // Retourne une liste de trades appariés BUY->SELL en FIFO, en supportant les ventes partielles
    const trades: Trade[] = [];

    // S'assurer que les investissements sont triés chronologiquement (asc)
    const sorted = investments
      .slice()
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    // Map coinId -> file (FIFO) de lots d'achat { quantity, price, timestamp }
    const buyQueues = new Map<
      string,
      Array<{ quantity: number; price: number; timestamp: Date }>
    >();

    for (const inv of sorted) {
      if (inv.action === "BUY") {
        const q = buyQueues.get(inv.coinId) || [];
        q.push({
          quantity: inv.quantity,
          price: inv.price,
          timestamp: new Date(inv.timestamp),
        });
        buyQueues.set(inv.coinId, q);
      } else if (inv.action === "SELL") {
        let remainingQty = inv.quantity;
        const sellPrice = inv.price;
        const sellTimestamp = new Date(inv.timestamp);
        const q = buyQueues.get(inv.coinId) || [];

        // Consommer les lots d'achat en FIFO
        while (remainingQty > 0 && q.length > 0) {
          const lot = q[0];
          const matchedQty = Math.min(lot.quantity, remainingQty);

          const pnl = matchedQty * (sellPrice - lot.price);
          const pnlPercent =
            lot.price > 0 ? (pnl / (matchedQty * lot.price)) * 100 : 0;
          const holdDays = Math.floor(
            (sellTimestamp.getTime() - new Date(lot.timestamp).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          trades.push({
            coinId: inv.coinId,
            buyPrice: lot.price,
            sellPrice: sellPrice,
            pnl,
            pnlPercent,
            holdDays,
            quantity: matchedQty,
            buyTimestamp: lot.timestamp,
            sellTimestamp,
          });

          // Mettre à jour le lot consommé
          lot.quantity -= matchedQty;
          if (lot.quantity <= 0) q.shift();
          remainingQty -= matchedQty;
        }

        // Si vente sans achats correspondants (vente déséquilibrée), on enregistre un enregistrement indicatif
        if (remainingQty > 0) {
          trades.push({
            coinId: inv.coinId,
            buyPrice: null,
            sellPrice: sellPrice,
            pnl: remainingQty * sellPrice,
            pnlPercent: 0,
            holdDays: 0,
            quantity: remainingQty,
            buyTimestamp: null,
            sellTimestamp,
          });
          remainingQty = 0;
        }

        if (q.length > 0) buyQueues.set(inv.coinId, q);
        else buyQueues.delete(inv.coinId);
      }
    }

    return trades;
  }

  public calculateAvgWin(trades: Trade[]): number {
    const wins = trades.filter((t) => t.pnlPercent > 0);
    return wins.length > 0
      ? wins.reduce((sum, t) => sum + t.pnlPercent, 0) / wins.length
      : 0;
  }

  public calculateAvgLoss(trades: Trade[]): number {
    const losses = trades.filter((t) => t.pnlPercent <= 0);
    return losses.length > 0
      ? losses.reduce((sum, t) => sum + t.pnlPercent, 0) / losses.length
      : 0;
  }

  public calculateMaxDrawdown(investments: Investment[]): number {
    // Calcul simplifié du drawdown maximum
    let peak = this.initialBalance;
    let maxDrawdown = 0;
    let currentValue = this.initialBalance;

    for (const investment of investments) {
      if (investment.action === "SELL") {
        currentValue += investment.amount;
      } else if (investment.action === "BUY") {
        currentValue -= investment.amount;
      }

      if (currentValue > peak) {
        peak = currentValue;
      }

      const drawdown = ((peak - currentValue) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private async saveInvestment(investment: Investment): Promise<void> {
    try {
      await this.prisma.cryptoInvestment.create({
        data: {
          id: investment.id,
          investorId: investment.investorId,
          coinId: investment.coinId,
          symbol: investment.symbol,
          name: investment.name,
          action: investment.action,
          amount: investment.amount,
          price: investment.price,
          quantity: investment.quantity,
          timestamp: investment.timestamp,
          reason: investment.reason,
          gemScore: investment.gemScore,
          sentiment: investment.sentiment,
          expectedHoldDays: investment.expectedHoldDays,
          targetProfit: investment.targetProfit,
          stopLoss: investment.stopLoss,
        },
      });
    } catch (error) {
      console.error(
        `Erreur sauvegarde investment ${this.profile.name}:`,
        error
      );
    }
  }

  private generateId(): string {
    return `${this.profile.id}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  // Méthodes publiques pour l'accès aux données
  getProfile(): InvestorProfile {
    return this.profile;
  }

  getPortfolio(): Portfolio {
    return this.portfolio;
  }

  async getInvestmentHistory(): Promise<Investment[]> {
    const investments = await this.prisma.cryptoInvestment.findMany({
      where: { investorId: this.profile.id },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    return investments.map((inv) => ({
      id: inv.id,
      investorId: inv.investorId,
      coinId: inv.coinId,
      symbol: inv.symbol,
      name: inv.name,
      action: inv.action as "BUY" | "SELL" | "HOLD",
      amount: inv.amount,
      price: inv.price,
      quantity: inv.quantity,
      timestamp: inv.timestamp,
      reason: inv.reason,
      gemScore: inv.gemScore,
      sentiment: inv.sentiment,
      expectedHoldDays: inv.expectedHoldDays,
      targetProfit: inv.targetProfit,
      stopLoss: inv.stopLoss,
      marketType: inv.marketType,
      isExecuted: inv.isExecuted,
      executionPrice: inv.executionPrice,
      fees: inv.fees,
      notes: inv.notes,
    }));
  }
}

// Réexporter le factory des profils
export { InvestorProfileFactory } from "../../../../types/investor";
