import { describe, it, expect, vi } from 'vitest';
import { CryptoGemHunter } from '../src/cryptoGemHunter';
import { CryptoProject } from '../../types/crypto';

/**
 * Tests complets pour la classe CryptoGemHunter
 * Couvre :
 * - Calcul du score de pépites avec différents scénarios
 * - Configuration et gestion des critères
 * - Surveillance et génération d'alertes
 * - Génération de rapports
 */


describe('CryptoGemHunter.calculateGemScore', () => {
  const hunter = new CryptoGemHunter();

  it('scores high for small market cap projects', () => {
    const proj: Partial<CryptoProject> = {
      market_cap: 5000000, // Small market cap < 10M
      price_change_percentage_24h: 25,
      total_volume: 500000,
      ath_change_percentage: -85,
      socialSentiment: { score: 0.9, mentions: 15 }
    };

    const score = hunter.calculateGemScore(proj as CryptoProject);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores high for projects with strong price increase', () => {
    const proj: Partial<CryptoProject> = {
      market_cap: 50000000,
      price_change_percentage_24h: 30, // Strong price increase > 20%
      total_volume: 5000000,
      ath_change_percentage: -70,
      socialSentiment: { score: 0.8, mentions: 20 }
    };

    const score = hunter.calculateGemScore(proj as CryptoProject);
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores high for projects with high volume ratio', () => {
    const proj: Partial<CryptoProject> = {
      market_cap: 10000000,
      price_change_percentage_24h: 15,
      total_volume: 2000000, // High volume ratio > 0.1
      ath_change_percentage: -80,
      socialSentiment: { score: 0.7, mentions: 10 }
    };

    const score = hunter.calculateGemScore(proj as CryptoProject);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores high for projects far from ATH with recovery', () => {
    const proj: Partial<CryptoProject> = {
      market_cap: 20000000,
      price_change_percentage_24h: 20,
      total_volume: 1000000,
      ath_change_percentage: -85, // Far from ATH < -80%
      socialSentiment: { score: 0.6, mentions: 8 }
    };

    const score = hunter.calculateGemScore(proj as CryptoProject);
    expect(score).toBeGreaterThan(60);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores bonus for excellent social sentiment', () => {
    const proj: Partial<CryptoProject> = {
      market_cap: 30000000,
      price_change_percentage_24h: 15,
      total_volume: 1500000,
      ath_change_percentage: -60,
      socialSentiment: { score: 0.9, mentions: 25 } // Excellent sentiment
    };

    const score = hunter.calculateGemScore(proj as CryptoProject);
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores low for large market cap projects with poor performance', () => {
    const proj: Partial<CryptoProject> = {
      market_cap: 200000000, // Large market cap
      price_change_percentage_24h: 2, // Low price change
      total_volume: 5000000,
      ath_change_percentage: -20, // Close to ATH
      socialSentiment: { score: 0.4, mentions: 3 } // Poor sentiment
    };

    const score = hunter.calculateGemScore(proj as CryptoProject);
    expect(score).toBeLessThan(30);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('handles projects without social sentiment', () => {
    const proj: Partial<CryptoProject> = {
      market_cap: 15000000,
      price_change_percentage_24h: 12,
      total_volume: 800000,
      ath_change_percentage: -75,
      // No socialSentiment
    };

    const score = hunter.calculateGemScore(proj as CryptoProject);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('never exceeds maximum score of 100', () => {
    const proj: Partial<CryptoProject> = {
      market_cap: 1000000, // Very small
      price_change_percentage_24h: 50, // Very high increase
      total_volume: 500000, // Very high volume ratio
      ath_change_percentage: -95, // Very far from ATH
      socialSentiment: { score: 1.0, mentions: 100 } // Perfect sentiment
    };

    const score = hunter.calculateGemScore(proj as CryptoProject);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('returns low score for projects with negative price change and poor fundamentals', () => {
    const proj: Partial<CryptoProject> = {
      market_cap: 500000000, // Very large
      price_change_percentage_24h: -10, // Negative change
      total_volume: 1000000, // Low volume ratio
      ath_change_percentage: 0, // At ATH
      socialSentiment: { score: 0.2, mentions: 1 } // Very poor sentiment
    };

    const score = hunter.calculateGemScore(proj as CryptoProject);
    expect(score).toBeLessThan(10); // Very low score but not necessarily 0
  });
});

describe('CryptoGemHunter configuration', () => {
  const hunter = new CryptoGemHunter();

  it('has default gem criteria', () => {
    const criteria = hunter.getGemCriteria();
    expect(criteria).toEqual({
      maxMarketCap: 100000000,
      minVolumeIncrease: 50,
      minPriceIncrease: 10,
      maxRank: 500,
      minSentimentScore: 0.6,
    });
  });

  it('can update gem criteria', () => {
    hunter.setGemCriteria({ maxMarketCap: 50000000, minPriceIncrease: 15 });
    const criteria = hunter.getGemCriteria();
    expect(criteria.maxMarketCap).toBe(50000000);
    expect(criteria.minPriceIncrease).toBe(15);
    expect(criteria.minVolumeIncrease).toBe(50); // Should remain unchanged
  });

  it('has default telegram cooldown', () => {
    const cooldown = hunter.getTelegramCooldown();
    expect(cooldown).toBe(6);
  });

  it('can set telegram cooldown within limits', () => {
    hunter.setTelegramCooldown(12);
    expect(hunter.getTelegramCooldown()).toBe(12);

    hunter.setTelegramCooldown(0.25); // Below minimum
    expect(hunter.getTelegramCooldown()).toBe(0.5);

    hunter.setTelegramCooldown(100); // Above maximum
    expect(hunter.getTelegramCooldown()).toBe(72);
  });
});

describe('CryptoGemHunter monitoring', () => {
  const hunter = new CryptoGemHunter();

  it('generates price alerts for high price changes', async () => {
    const projects: CryptoProject[] = [
      {
        id: 'test-coin',
        symbol: 'TEST',
        name: 'Test Coin',
        current_price: 1.5,
        market_cap: 10000000,
        market_cap_rank: 100,
        price_change_percentage_24h: 60, // High price change
        volume_24h: 1000000,
        total_volume: 1000000,
        circulating_supply: 1000000,
        ath: 2.0,
        ath_change_percentage: -25,
        last_updated: new Date().toISOString(),
      }
    ];

    await hunter.monitorProjects(projects);
    const alerts = hunter.getAlerts();
    
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some(alert => alert.type === 'price')).toBe(true);
    expect(alerts.some(alert => alert.priority === 'high')).toBe(true);
  });

  it('generates volume alerts for unusual volume', async () => {
    const projects: CryptoProject[] = [
      {
        id: 'volume-coin',
        symbol: 'VOL',
        name: 'Volume Coin',
        current_price: 1.0,
        market_cap: 5000000,
        market_cap_rank: 200,
        price_change_percentage_24h: 5,
        volume_24h: 1500000, // High volume relative to market cap (0.3 ratio)
        total_volume: 1500000,
        circulating_supply: 5000000,
        ath: 1.2,
        ath_change_percentage: -17,
        last_updated: new Date().toISOString(),
      }
    ];

    await hunter.monitorProjects(projects);
    const alerts = hunter.getAlerts();
    
    expect(alerts.some(alert => alert.type === 'volume')).toBe(true);
  });

  it('generates gem alerts for high scoring projects', async () => {
    const projects: CryptoProject[] = [
      {
        id: 'gem-coin',
        symbol: 'GEM',
        name: 'Gem Coin',
        current_price: 0.5,
        market_cap: 5000000,
        market_cap_rank: 150,
        price_change_percentage_24h: 25,
        volume_24h: 1000000,
        total_volume: 1000000,
        circulating_supply: 10000000,
        ath: 2.0,
        ath_change_percentage: -75,
        last_updated: new Date().toISOString(),
        gemScore: 85, // High gem score
      }
    ];

    await hunter.monitorProjects(projects);
    const alerts = hunter.getAlerts();
    
    expect(alerts.some(alert => alert.type === 'gem')).toBe(true);
    expect(alerts.some(alert => alert.priority === 'high')).toBe(true);
  });
});

describe('CryptoGemHunter report generation', () => {
  const hunter = new CryptoGemHunter();

  it('generates a proper report structure', async () => {
    const gems: CryptoProject[] = [
      {
        id: 'test-gem',
        symbol: 'TGEM',
        name: 'Test Gem',
        current_price: 1.0,
        market_cap: 8000000,
        market_cap_rank: 120,
        price_change_percentage_24h: 15,
        volume_24h: 800000,
        total_volume: 800000,
        circulating_supply: 8000000,
        ath: 3.0,
        ath_change_percentage: -67,
        last_updated: new Date().toISOString(),
        gemScore: 75,
        socialSentiment: { score: 0.8, mentions: 12 }
      }
    ];

    // Mock Prisma methods to avoid database calls
    hunter.prisma.cryptoGemProject.upsert = vi.fn().mockResolvedValue({});
    hunter.prisma.cryptoGemAlert.create = vi.fn().mockResolvedValue({});
    hunter.prisma.$disconnect = vi.fn().mockResolvedValue(undefined);

    const report = await hunter.generateReport(gems);

    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('totalGemsFound', 1);
    expect(report).toHaveProperty('gems');
    expect(report).toHaveProperty('alerts');
    expect(report).toHaveProperty('telegramSent', false);
    
    expect(report.gems).toHaveLength(1);
    expect(report.gems[0]).toMatchObject({
      name: 'Test Gem',
      symbol: 'TGEM',
      price: 1.0,
      marketCap: 8000000,
      priceChange24h: 15,
      gemScore: 75,
      rank: 120
    });
    
    expect(report.gems[0].sentiment).toEqual({ score: 0.8, mentions: 12 });
  });

  it('handles empty gems list', async () => {
    const gems: CryptoProject[] = [];

    hunter.prisma.$disconnect = vi.fn().mockResolvedValue(undefined);

    const report = await hunter.generateReport(gems);

    expect(report.totalGemsFound).toBe(0);
    expect(report.gems).toHaveLength(0);
    expect(report.telegramSent).toBe(false);
  });
});
