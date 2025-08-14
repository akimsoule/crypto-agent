import { describe, it, expect } from 'vitest';
import { CryptoGemHunter } from '../src/cryptoGemHunter';

describe('CryptoGemHunter.calculateGemScore', () => {
  it('scores projects sensibly', () => {
    const hunter = new CryptoGemHunter();
    const proj: any = {
      market_cap: 2000000,
      price_change_percentage_24h: 25,
      total_volume: 500000,
      ath_change_percentage: -85,
      socialSentiment: { score: 0.9, mentions: 15 }
    };

    const score = (hunter as any).calculateGemScore(proj);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
