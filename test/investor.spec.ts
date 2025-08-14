import { describe, it, expect } from 'vitest';
import { InvestorProfileFactory } from '../src/types';
import { InvestorAgent } from '../src/investor/investorAgent';
import { CryptoProject } from '../src/cryptoGemHunter';

describe('Investor scoring and buy/sell logic', () => {
  it('calculates score and decides to buy for aggressive profile', async () => {
    const profiles = InvestorProfileFactory.createProfiles();
    const aggressive = profiles.find(p => p.type === 'aggressive')!;
    const agent = new InvestorAgent(aggressive);

    const gem: CryptoProject = {
      id: 'testcoin',
      symbol: 'TST',
      name: 'Test Coin',
      current_price: 1,
      market_cap: 5000000,
      market_cap_rank: 400,
      price_change_percentage_24h: 35,
      volume_24h: 100000,
      total_volume: 100000,
      circulating_supply: 1000000,
      ath: 10,
      ath_change_percentage: -90,
      last_updated: new Date().toISOString(),
      gemScore: 80,
      socialSentiment: { score: 0.7, mentions: 20, positiveRatio: 0.8 }
    };

    const score = (agent as any).calculateInvestorScore(gem);
    expect(score).toBeGreaterThanOrEqual(0);

    const shouldBuy = (agent as any).shouldBuy(gem);
    expect(shouldBuy.shouldBuy).toBeTruthy();
  });

  it('does not buy when market cap too low', async () => {
    const profiles = InvestorProfileFactory.createProfiles();
    const balanced = profiles.find(p => p.type === 'balanced')!;
    const agent = new InvestorAgent(balanced);

    const gem: CryptoProject = {
      id: 'microcoin',
      symbol: 'MIC',
      name: 'Micro Coin',
      current_price: 0.01,
      market_cap: 50000,
      market_cap_rank: 9999,
      price_change_percentage_24h: 5,
      volume_24h: 1000,
      total_volume: 1000,
      circulating_supply: 1000000,
      ath: 1,
      ath_change_percentage: -90,
      last_updated: new Date().toISOString(),
      gemScore: 30,
    };

    const shouldBuy = (agent as any).shouldBuy(gem);
    expect(shouldBuy.shouldBuy).toBeFalsy();
  });
});
