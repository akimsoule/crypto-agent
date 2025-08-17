
import { CryptoProject } from "../../../../types/crypto";
import { ActionResult } from "../../../../types/api";
import prisma from "../../infrastructure/database/prismaClient";
import { CryptoInvestment, PrismaClient } from "@prisma/client";

// Utiliser `any` pour Prisma si le client généré n'est pas encore importé typé
const defaultPrisma: PrismaClient = prisma;

export async function watchMarketAndAct(
  investorId: string,
  gems: CryptoProject[],
  prismaClient?: PrismaClient
): Promise<ActionResult> {
  const prisma = prismaClient || defaultPrisma;
  const createdInvestments: CryptoInvestment[] = [];

  // Récupérer le profil d'investisseur
  const profile = await prisma.investorProfile.findUnique({ where: { id: investorId } });
  if (!profile) throw new Error(`Investor profile introuvable: ${investorId}`);

  // Récupérer l'historique des investissements du profil (ordonné asc)
  const investments = await prisma.cryptoInvestment.findMany({
    where: { investorId },
    orderBy: { timestamp: 'asc' }
  });

  // Construire l'état des positions ouvertes (BUY sans SELL correspondant)
  const openPositions = new Map<string, CryptoInvestment[]>();
  for (const inv of investments) {
    if (inv.action === "BUY") {
      // si pas de position existante, on enregistre le buy
      const existing = openPositions.get(inv.coinId) || [];
      // Cast action to "BUY" to satisfy Investment type
      existing.push({ 
        ...inv, 
        action: "BUY" as const
      });
      openPositions.set(inv.coinId, existing);
    } else if (inv.action === "SELL") {
      // supprimer les buys couverts par ce sell (approche FIFO)
      const buys = openPositions.get(inv.coinId) || [];
      if (buys.length > 0) {
        // consommer le premier buy
        buys.shift();
        if (buys.length === 0) openPositions.delete(inv.coinId);
        else openPositions.set(inv.coinId, buys);
      }
    }
  }

  // Fonctions utilitaires locales
  function getMinimumScore(type: string): number {
    switch (type) {
      case 'conservative': return 60;
      case 'balanced': return 50;
      case 'aggressive': return 40;
      case 'momentum': return 45;
      case 'contrarian': return 35;
      default: return 50;
    }
  }

  function calculateScore(gem: CryptoProject): number {
    let score = gem.gemScore || 0;

    // Ajustements simples inspirés de l'agent
    if ((gem.market_cap_rank || 999999) <= 100) score += 20;
    if ((gem.price_change_percentage_24h || 0) > 30) score += 15;
    if ((gem.market_cap || 0) < 10000000) score += 10;

    if (gem.socialSentiment) {
      const sentimentBonus = ((gem.socialSentiment.score || 0) - 0.5) * 20 * (profile?.sentimentWeight || 0);
      score += sentimentBonus;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Calculer la taille maximale par position (USD) basée sur l'initialBalance
  const initialBalance = profile.initialBalance || 10000;
  const maxPositionValueUSD = (initialBalance * (profile.maxPositionSize || 10)) / 100;

  // 1) Évaluer ventes possibles pour les positions ouvertes
  for (const [coinId, buys] of openPositions.entries()) {
    // chercher le gem courant
    const gem = gems.find(g => g.id === coinId);
    if (!gem) continue; // pas de donnée de prix actuelle

    // calculer la position agrégée (simplifié: on regarde le premier buy FIFO)
    const buy = buys[0];
    const buyPrice = buy.price;
    const currentPrice = gem.current_price;
    const pnlPercent = ((currentPrice - buyPrice) / buyPrice) * 100;

    const daysHeld = Math.floor((Date.now() - new Date(buy.timestamp).getTime()) / (1000 * 60 * 60 * 24));

    let shouldSell = false;
    let reason = '';

    if (pnlPercent >= (profile.sellThreshold || 999)) {
      shouldSell = true;
      reason = `Take profit: ${pnlPercent.toFixed(2)}%`;
    }

    if (pnlPercent <= -(profile.stopLoss || 999)) {
      shouldSell = true;
      reason = `Stop loss: ${pnlPercent.toFixed(2)}%`;
    }

    if (daysHeld >= (profile.holdingPeriod || 365)) {
      shouldSell = true;
      reason = `Holding period exceeded: ${daysHeld} days`;
    }

    if (shouldSell) {
      const amount = (buy.quantity || 0) * currentPrice;

      const sell = {
        id: `${investorId}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
        investorId,
        coinId: coinId,
        symbol: gem.symbol,
        name: gem.name,
        action: 'SELL',
        amount,
        price: currentPrice,
        quantity: buy.quantity,
        timestamp: new Date(),
        reason,
        gemScore: gem.gemScore,
        sentiment: gem.socialSentiment?.score || null,
        expectedHoldDays: daysHeld,
        targetProfit: profile.sellThreshold || null,
        stopLoss: profile.stopLoss || null,
        // Champs Prisma disponibles pour marquer le trade comme spot / exécuté
        isExecuted: true,
        executionPrice: currentPrice,
        fees: 0,
        notes: 'SPOT trade'
      };

      const created : CryptoInvestment = await prisma.cryptoInvestment.create({ data: sell });
      createdInvestments.push(created);

      // Consommer le buy correspondant
      buys.shift();
      if (buys.length === 0) openPositions.delete(coinId);
      else openPositions.set(coinId, buys);
    }
  }

  // 2) Évaluer nouveaux achats
  // Filter gems et trier par score
  const scoredGems = gems.map(g => ({ ...g, investorScore: calculateScore(g) }))
    .filter(g => g.investorScore >= getMinimumScore(profile.type))
    .sort((a,b) => b.investorScore - a.investorScore);

  // Acheter jusqu'à une position maximale (1 position par gem ici, simplifié)
  for (const gem of scoredGems) {
    // ne pas racheter si déjà position ouverte
    if (openPositions.has(gem.id)) continue;

    if ((gem.market_cap || 0) < 100000) continue; // filtre minimal

    // Calcul montant d'achat
    const allocation = Math.min(maxPositionValueUSD, initialBalance * (profile.riskTolerance || 0.5));
    if (allocation < 100) continue; // minimum $100

    const quantity = allocation / gem.current_price;

    const buy = {
      id: `${investorId}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
      investorId,
      coinId: gem.id,
      symbol: gem.symbol,
      name: gem.name,
      action: 'BUY',
      amount: allocation,
      price: gem.current_price,
      quantity,
      timestamp: new Date(),
      reason: `Auto-buy: score ${gem.investorScore.toFixed(1)}`,
      gemScore: gem.gemScore ?? null,
      sentiment: gem.socialSentiment?.score || null,
      expectedHoldDays: profile.holdingPeriod || 30,
      targetProfit: profile.sellThreshold || null,
      stopLoss: profile.stopLoss || null,
      // Marquer explicitement comme spot
      marketType: 'SPOT',
      isExecuted: true,
      executionPrice: gem.current_price,
      fees: 0,
      notes: 'SPOT trade'
    };

    const created = await prisma.cryptoInvestment.create({ data: buy });
    createdInvestments.push(created);

    // ajouter à openPositions en mémoire
    openPositions.set(gem.id, [buy]);
  }

  return { created: createdInvestments.length, investments: createdInvestments };
}
