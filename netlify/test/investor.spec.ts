import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvestorProfileFactory } from '../../types/investor';
import { InvestorAgent } from '../src/investor/investorAgent';
import { CryptoProject } from '../../types/crypto';
import type { InvestorProfile } from '@prisma/client';

/**
 * Tests complets pour la classe InvestorAgent
 * Couvre :
 * - Calcul du score d'investisseur pour différents profils
 * - Logic d'achat/vente selon les profils
 * - Gestion des seuils minimum
 * - Gestion des allocations et positions
 */

// Mock Prisma
vi.mock('../src/prismaClient', () => ({
  default: {
    cryptoInvestment: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    cryptoPosition: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    cryptoPortfolioSnapshot: {
      create: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

describe('Investor scoring and buy/sell logic', () => {
  let profiles: InvestorProfile[];

  beforeEach(() => {
    const profileInputs = InvestorProfileFactory.createProfiles();
    const now = new Date();
    
    // Convert InvestorProfileInput to full InvestorProfile
    profiles = profileInputs.map(input => ({
      ...input,
      createdAt: now,
      updatedAt: now,
    } as InvestorProfile));
  });

  describe('Aggressive Profile', () => {
    it('calculates high score for high volatility small cap gems', () => {
      const aggressive = profiles.find(p => p.type === 'aggressive')!;
      const agent = new InvestorAgent(aggressive);

      const gem: CryptoProject = {
        id: 'volatile-gem',
        symbol: 'VTL',
        name: 'Volatile Gem',
        current_price: 1,
        market_cap: 5000000, // Small cap
        market_cap_rank: 400,
        price_change_percentage_24h: 35, // High volatility
        volume_24h: 100000,
        total_volume: 100000,
        circulating_supply: 1000000,
        ath: 10,
        ath_change_percentage: -90, // Very undervalued
        last_updated: new Date().toISOString(),
        gemScore: 80,
        socialSentiment: { score: 0.7, mentions: 20, positiveRatio: 0.8 }
      };

      const score = agent.calculateInvestorScore(gem);
      expect(score).toBeGreaterThan(80); // Should get bonuses for volatility and small cap
      
      const shouldBuy = agent.shouldBuy(gem);
      expect(shouldBuy.shouldBuy).toBeTruthy();
      expect(shouldBuy.reason).toContain('Score');
    });

    it('has minimum score threshold of 40', () => {
      const aggressive = profiles.find(p => p.type === 'aggressive')!;
      const agent = new InvestorAgent(aggressive);
      
      expect(agent.getMinimumScore()).toBe(40);
    });

    it('allows up to 5 new positions', () => {
      const aggressive = profiles.find(p => p.type === 'aggressive')!;
      const agent = new InvestorAgent(aggressive);
      
      expect(agent.getMaxNewPositions()).toBe(5);
    });
  });

  describe('Conservative Profile', () => {
    it('calculates score favoring stable large cap projects', () => {
      const conservative = profiles.find(p => p.type === 'conservative')!;
      const agent = new InvestorAgent(conservative);

      const gem: CryptoProject = {
        id: 'stable-gem',
        symbol: 'STB',
        name: 'Stable Gem',
        current_price: 100,
        market_cap: 100000000, // Large cap
        market_cap_rank: 50, // Top 50
        price_change_percentage_24h: 8, // Moderate change
        volume_24h: 5000000,
        total_volume: 5000000,
        circulating_supply: 1000000,
        ath: 120,
        ath_change_percentage: -17,
        last_updated: new Date().toISOString(),
        gemScore: 65,
        socialSentiment: { score: 0.8, mentions: 50, positiveRatio: 0.9 }
      };

      const score = agent.calculateInvestorScore(gem);
      expect(score).toBeGreaterThan(75); // Should get bonuses for stability
      
      const shouldBuy = agent.shouldBuy(gem);
      expect(shouldBuy.shouldBuy).toBeTruthy();
    });

    it('penalizes extreme volatility', () => {
      const conservative = profiles.find(p => p.type === 'conservative')!;
      const agent = new InvestorAgent(conservative);

      const gem: CryptoProject = {
        id: 'volatile-gem',
        symbol: 'VTL',
        name: 'Volatile Gem',
        current_price: 1,
        market_cap: 10000000,
        market_cap_rank: 200,
        price_change_percentage_24h: 75, // Extreme volatility
        volume_24h: 100000,
        total_volume: 100000,
        circulating_supply: 1000000,
        ath: 10,
        ath_change_percentage: -90,
        last_updated: new Date().toISOString(),
        gemScore: 70,
      };

      const score = agent.calculateInvestorScore(gem);
      expect(score).toBeLessThan(70); // Should be penalized for extreme volatility
    });

    it('has minimum score threshold of 60', () => {
      const conservative = profiles.find(p => p.type === 'conservative')!;
      const agent = new InvestorAgent(conservative);
      
      expect(agent.getMinimumScore()).toBe(60);
    });

    it('allows only 2 new positions', () => {
      const conservative = profiles.find(p => p.type === 'conservative')!;
      const agent = new InvestorAgent(conservative);
      
      expect(agent.getMaxNewPositions()).toBe(2);
    });
  });

  describe('Momentum Profile', () => {
    it('favors high volume and positive momentum', () => {
      const momentum = profiles.find(p => p.type === 'momentum')!;
      const agent = new InvestorAgent(momentum);

      const gem: CryptoProject = {
        id: 'momentum-gem',
        symbol: 'MOM',
        name: 'Momentum Gem',
        current_price: 5,
        market_cap: 20000000,
        market_cap_rank: 150,
        price_change_percentage_24h: 25, // Strong momentum
        volume_24h: 3000000, // High volume ratio (0.15)
        total_volume: 3000000,
        circulating_supply: 4000000,
        ath: 8,
        ath_change_percentage: -37,
        last_updated: new Date().toISOString(),
        gemScore: 60,
        socialSentiment: { score: 0.9, mentions: 30 }
      };

      const score = agent.calculateInvestorScore(gem);
      expect(score).toBeGreaterThan(75); // Should get bonuses for momentum and volume
      
      const shouldBuy = agent.shouldBuy(gem);
      expect(shouldBuy.shouldBuy).toBeTruthy();
    });

    it('has minimum score threshold of 45', () => {
      const momentum = profiles.find(p => p.type === 'momentum')!;
      const agent = new InvestorAgent(momentum);
      
      expect(agent.getMinimumScore()).toBe(45);
    });
  });

  describe('Contrarian Profile', () => {
    it('favors negative sentiment and price drops', () => {
      const contrarian = profiles.find(p => p.type === 'contrarian')!;
      const agent = new InvestorAgent(contrarian);

      const gem: CryptoProject = {
        id: 'beaten-down',
        symbol: 'BTD',
        name: 'Beaten Down',
        current_price: 0.5,
        market_cap: 15000000,
        market_cap_rank: 300,
        price_change_percentage_24h: -25, // Heavy drop
        volume_24h: 500000,
        total_volume: 500000,
        circulating_supply: 30000000,
        ath: 5,
        ath_change_percentage: -90,
        last_updated: new Date().toISOString(),
        gemScore: 45,
        socialSentiment: { score: 0.2, mentions: 15 } // Very negative sentiment
      };

      const score = agent.calculateInvestorScore(gem);
      expect(score).toBeGreaterThan(65); // Should get bonuses for negative sentiment and price drop
      
      const shouldBuy = agent.shouldBuy(gem);
      expect(shouldBuy.shouldBuy).toBeTruthy();
    });

    it('has minimum score threshold of 35', () => {
      const contrarian = profiles.find(p => p.type === 'contrarian')!;
      const agent = new InvestorAgent(contrarian);
      
      expect(agent.getMinimumScore()).toBe(35);
    });
  });

  describe('Balanced Profile', () => {
    it('balances all factors moderately', () => {
      const balanced = profiles.find(p => p.type === 'balanced')!;
      const agent = new InvestorAgent(balanced);

      const gem: CryptoProject = {
        id: 'balanced-gem',
        symbol: 'BAL',
        name: 'Balanced Gem',
        current_price: 2,
        market_cap: 40000000,
        market_cap_rank: 200,
        price_change_percentage_24h: 15, // Moderate momentum
        volume_24h: 2000000,
        total_volume: 2000000,
        circulating_supply: 20000000,
        ath: 4,
        ath_change_percentage: -50,
        last_updated: new Date().toISOString(),
        gemScore: 65,
        socialSentiment: { score: 0.6, mentions: 25 }
      };

      const score = agent.calculateInvestorScore(gem);
      expect(score).toBeGreaterThan(70);
      
      const shouldBuy = agent.shouldBuy(gem);
      expect(shouldBuy.shouldBuy).toBeTruthy();
    });

    it('has minimum score threshold of 50', () => {
      const balanced = profiles.find(p => p.type === 'balanced')!;
      const agent = new InvestorAgent(balanced);
      
      expect(agent.getMinimumScore()).toBe(50);
    });
  });

  describe('General Rules', () => {
    it('does not buy when market cap too low', () => {
      const balanced = profiles.find(p => p.type === 'balanced')!;
      const agent = new InvestorAgent(balanced);

      const gem: CryptoProject = {
        id: 'microcoin',
        symbol: 'MIC',
        name: 'Micro Coin',
        current_price: 0.01,
        market_cap: 50000, // Below 100k threshold
        market_cap_rank: 9999,
        price_change_percentage_24h: 5,
        volume_24h: 1000,
        total_volume: 1000,
        circulating_supply: 1000000,
        ath: 1,
        ath_change_percentage: -90,
        last_updated: new Date().toISOString(),
        gemScore: 70,
      };

      const shouldBuy = agent.shouldBuy(gem);
      expect(shouldBuy.shouldBuy).toBeFalsy();
      expect(shouldBuy.reason).toContain('Market cap trop faible');
    });

    it('does not buy when score is below minimum threshold', () => {
      const conservative = profiles.find(p => p.type === 'conservative')!;
      const agent = new InvestorAgent(conservative);

      const gem: CryptoProject = {
        id: 'low-score',
        symbol: 'LOW',
        name: 'Low Score',
        current_price: 1,
        market_cap: 50000000,
        market_cap_rank: 500,
        price_change_percentage_24h: 2,
        volume_24h: 100000,
        total_volume: 100000,
        circulating_supply: 50000000,
        ath: 2,
        ath_change_percentage: -50,
        last_updated: new Date().toISOString(),
        gemScore: 30, // Low gem score
      };

      const shouldBuy = agent.shouldBuy(gem);
      expect(shouldBuy.shouldBuy).toBeFalsy();
      expect(shouldBuy.reason).toContain('Score insuffisant');
    });

    it('calculates allocation percentage based on risk and gem score', () => {
      const aggressive = profiles.find(p => p.type === 'aggressive')!;
      const agent = new InvestorAgent(aggressive);

      const highScoreGem: CryptoProject = {
        id: 'high-score',
        symbol: 'HIGH',
        name: 'High Score',
        current_price: 1,
        market_cap: 10000000,
        market_cap_rank: 100,
        price_change_percentage_24h: 20,
        volume_24h: 500000,
        total_volume: 500000,
        circulating_supply: 10000000,
        ath: 3,
        ath_change_percentage: -67,
        last_updated: new Date().toISOString(),
        gemScore: 90,
      };

      const lowScoreGem: CryptoProject = {
        ...highScoreGem,
        id: 'low-score',
        gemScore: 40,
      };

      const highAllocation = agent.getAllocationPercent(highScoreGem);
      const lowAllocation = agent.getAllocationPercent(lowScoreGem);

      expect(highAllocation).toBeGreaterThan(lowAllocation);
      expect(highAllocation).toBeLessThanOrEqual(aggressive.maxPositionSize / 100);
    });

    it('does not buy existing positions', () => {
      const balanced = profiles.find(p => p.type === 'balanced')!;
      const agent = new InvestorAgent(balanced);

      // Simuler une position existante en ajoutant une position au portfolio
      const existingGem: CryptoProject = {
        id: 'existing-coin',
        symbol: 'EXIST',
        name: 'Existing Coin',
        current_price: 2,
        market_cap: 20000000,
        market_cap_rank: 150,
        price_change_percentage_24h: 15,
        volume_24h: 1000000,
        total_volume: 1000000,
        circulating_supply: 10000000,
        ath: 4,
        ath_change_percentage: -50,
        last_updated: new Date().toISOString(),
        gemScore: 70,
      };

      // Simuler une position existante en modifiant le portfolio directement
      const agentWithPortfolio = agent as unknown as { portfolio: { positions: Array<{
        id: number;
        investorId: string;
        coinId: string;
        symbol: string;
        quantity: number;
        avgBuyPrice: number;
        currentPrice: number;
        totalInvested: number;
        unrealizedPnL: number;
        unrealizedPnLPercent: number;
        daysSinceEntry: number;
        lastUpdated: Date;
      }> } };
      
      agentWithPortfolio.portfolio.positions.push({
        id: 1,
        investorId: 'test',
        coinId: 'existing-coin',
        symbol: 'EXIST',
        quantity: 100,
        avgBuyPrice: 1.5,
        currentPrice: 2,
        totalInvested: 150,
        unrealizedPnL: 50,
        unrealizedPnLPercent: 33.33,
        daysSinceEntry: 5,
        lastUpdated: new Date(),
      });

      const shouldBuy = agent.shouldBuy(existingGem);
      expect(shouldBuy.shouldBuy).toBeFalsy();
      expect(shouldBuy.reason).toContain('Position déjà existante');
    });

    it('updates portfolio positions with current prices', async () => {
      const aggressive = profiles.find(p => p.type === 'aggressive')!;
      const agent = new InvestorAgent(aggressive);

      // Ajouter une position existante
      const agentWithPortfolio = agent as unknown as { portfolio: { positions: Array<{
        id: number;
        investorId: string;
        coinId: string;
        symbol: string;
        quantity: number;
        avgBuyPrice: number;
        currentPrice: number;
        totalInvested: number;
        unrealizedPnL: number;
        unrealizedPnLPercent: number;
        daysSinceEntry: number;
        lastUpdated: Date;
      }> } };
      
      agentWithPortfolio.portfolio.positions.push({
        id: 1,
        investorId: 'test',
        coinId: 'test-coin',
        symbol: 'TEST',
        quantity: 100,
        avgBuyPrice: 1,
        currentPrice: 1, // Prix initial
        totalInvested: 100,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        daysSinceEntry: 0,
        lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000), // Il y a 1 jour
      });

      const gems: CryptoProject[] = [{
        id: 'test-coin',
        symbol: 'TEST',
        name: 'Test Coin',
        current_price: 1.5, // Prix mis à jour
        market_cap: 10000000,
        market_cap_rank: 100,
        price_change_percentage_24h: 50,
        volume_24h: 500000,
        total_volume: 500000,
        circulating_supply: 10000000,
        ath: 2,
        ath_change_percentage: -25,
        last_updated: new Date().toISOString(),
        gemScore: 75,
      }];

      await agent.updatePortfolio(gems);

      const position = agentWithPortfolio.portfolio.positions[0];
      expect(position.currentPrice).toBe(1.5);
      expect(position.unrealizedPnL).toBe(50); // (1.5 - 1) * 100
      expect(position.unrealizedPnLPercent).toBe(50); // ((1.5 - 1) / 1) * 100
      expect(position.daysSinceEntry).toBe(1);
    });
  });
});
