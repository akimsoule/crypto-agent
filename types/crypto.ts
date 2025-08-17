// Types liés aux crypto-monnaies et aux projets crypto

export interface CryptoProject {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  volume_24h: number;
  total_volume: number;
  circulating_supply: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  last_updated: string;
  gemScore?: number;
  socialSentiment?: {
    score: number;
    mentions: number;
    positiveRatio?: number;
  };
}

export interface GemCriteria {
  maxMarketCap: number;
  minVolumeIncrease: number;
  minPriceIncrease: number;
  maxRank: number;
  minSentimentScore: number;
}

export interface CryptoAlert {
  type: string;
  message: string;
  project: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface CryptoGemReport {
  timestamp: string;
  totalGemsFound: number;
  gems: {
    name: string;
    symbol: string;
    price: number;
    marketCap: number;
    priceChange24h: number;
    gemScore?: number;
    sentiment?: {
      score: number;
      mentions: number;
      positiveRatio?: number;
    };
    rank: number;
  }[];
  alerts: CryptoAlert[];
  telegramSent: boolean;
}
