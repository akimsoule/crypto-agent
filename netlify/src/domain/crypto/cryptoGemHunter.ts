import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import prisma from "../../infrastructure/database/prismaClient";
import { CryptoProject, GemCriteria, CryptoAlert, CryptoGemReport } from "../../../../types/crypto";

// simple retry wrapper without external dependency
async function fetchWithRetry(url: string, opts: AxiosRequestConfig = {}, retries = 3, backoff = 300): Promise<AxiosResponse | undefined> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await axios.get(url, opts);
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise((res) => setTimeout(res, backoff * Math.pow(2, attempt - 1)));
    }
  }
}



export class CryptoGemHunter {
  public prisma: typeof prisma;
  private alerts: CryptoAlert[] = [];
  private gemCriteria: GemCriteria;
  private lastAPICall = 0;
  private minInterval = 100;
  private telegramCooldownHours = 6;

  constructor() {
    this.prisma = prisma;

    this.gemCriteria = {
      maxMarketCap: 100000000,
      minVolumeIncrease: 50,
      minPriceIncrease: 10,
      maxRank: 500,
      minSentimentScore: 0.6,
    };
  }

  async fetchMarketData(page: number = 1, perPage: number = 250) {
    try {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastAPICall;
      if (timeSinceLastCall < this.minInterval) {
        await new Promise((resolve) => setTimeout(resolve, this.minInterval - timeSinceLastCall));
      }
      this.lastAPICall = Date.now();

      const response = await fetchWithRetry(`https://api.coinpaprika.com/v1/tickers`, {
        params: { start: (page - 1) * perPage, limit: perPage },
        timeout: 15000,
        headers: { "Content-Type": "application/json" },
      }, 3, 300);

      if (!response || !response.data || !Array.isArray(response.data)) return [];

      interface CryptoData {
        id: string;
        symbol: string;
        name: string;
        rank?: number;
        circulating_supply?: string | number;
        max_supply?: string | number;
        last_updated?: string;
        quotes?: {
          USD?: {
            price: string | number;
            market_cap: string | number;
            volume_24h: string | number;
            percent_change_24h: string | number;
            ath_price?: string | number;
            percent_from_price_ath?: string | number;
          }
        };
      }

      const validCryptos = response.data.filter((crypto: CryptoData) => {
        if (!crypto.quotes?.USD) return false;
        const price = typeof crypto.quotes.USD.price === 'string' ? parseFloat(crypto.quotes.USD.price) : crypto.quotes.USD.price;
        const marketCap = typeof crypto.quotes.USD.market_cap === 'string' ? parseFloat(crypto.quotes.USD.market_cap) : crypto.quotes.USD.market_cap;
        const volume24h = typeof crypto.quotes.USD.volume_24h === 'string' ? parseFloat(crypto.quotes.USD.volume_24h) : crypto.quotes.USD.volume_24h;
        return price > 0 && marketCap > 0 && volume24h > 1000;
      });

      const projects = validCryptos.map((crypto: CryptoData) => {
        const usdQuote = crypto.quotes!.USD!;
        const price = typeof usdQuote.price === 'string' ? parseFloat(usdQuote.price) : usdQuote.price;
        const marketCap = typeof usdQuote.market_cap === 'string' ? parseFloat(usdQuote.market_cap) : usdQuote.market_cap;
        const volume24h = typeof usdQuote.volume_24h === 'string' ? parseFloat(usdQuote.volume_24h) : usdQuote.volume_24h;
        const change24h = typeof usdQuote.percent_change_24h === 'string' ? parseFloat(usdQuote.percent_change_24h) : usdQuote.percent_change_24h;
        
        const athPrice = usdQuote.ath_price !== undefined ? 
          (typeof usdQuote.ath_price === 'string' ? parseFloat(usdQuote.ath_price) : usdQuote.ath_price) : 
          price * 1.5;
        
        const athChange = usdQuote.percent_from_price_ath !== undefined ?
          (typeof usdQuote.percent_from_price_ath === 'string' ? parseFloat(usdQuote.percent_from_price_ath) : usdQuote.percent_from_price_ath) :
          -20;

        return {
          id: crypto.id,
          symbol: crypto.symbol,
          name: crypto.name,
          current_price: price,
          market_cap: marketCap,
          market_cap_rank: crypto.rank || 999999,
          price_change_percentage_24h: change24h,
          volume_24h: volume24h,
          total_volume: volume24h,
          circulating_supply: crypto.circulating_supply !== undefined ?
            (typeof crypto.circulating_supply === 'string' ? parseFloat(crypto.circulating_supply) : crypto.circulating_supply) : 0,
          max_supply: crypto.max_supply !== undefined ?
            (typeof crypto.max_supply === 'string' ? parseFloat(crypto.max_supply) : crypto.max_supply) : undefined,
          ath: athPrice,
          ath_change_percentage: athChange,
          last_updated: crypto.last_updated || new Date().toISOString(),
        } as CryptoProject;
      });

      return projects;
    } catch (error) {
      console.error("Erreur fetchMarketData:", error);
      return [];
    }
  }

  calculateGemScore(project: CryptoProject) {
    let score = 0;
    if (project.market_cap < 10000000) score += 30;
    else if (project.market_cap < 50000000) score += 20;
    else if (project.market_cap < 100000000) score += 10;

    if (project.price_change_percentage_24h > 20) score += 25;
    else if (project.price_change_percentage_24h > 10) score += 15;
    else if (project.price_change_percentage_24h > 5) score += 10;

    const volumeToMarketCapRatio = project.total_volume / project.market_cap;
    if (volumeToMarketCapRatio > 0.1) score += 20;
    else if (volumeToMarketCapRatio > 0.05) score += 10;

    if (project.ath_change_percentage < -80) score += 25;
    else if (project.ath_change_percentage < -60) score += 15;
    else if (project.ath_change_percentage > -50) score += 5;

    if (project.ath_change_percentage > -30 && project.price_change_percentage_24h > 10) score += 20;
    if (project.ath_change_percentage < -70 && project.price_change_percentage_24h > 5) score += 15;

    if (project.socialSentiment) {
      if (project.socialSentiment.score > 0.8) score += 20;
      else if (project.socialSentiment.score > 0.6) score += 10;
      if (project.socialSentiment.mentions > 10) score += 5;
    }

    return Math.min(score, 100);
  }

  async getOrCreateState() {
    let state = await this.prisma.cryptoGemState.findFirst({ where: { id: 1 } });
    if (!state) {
      state = await this.prisma.cryptoGemState.create({ data: { id: 1, currentPage: 1, maxPages: 40, batchSize: 100, lastCycleStart: new Date(), processPhase: "FETCH" } });
    }
    return state;
  }

  async updateState(updates: Partial<{
    currentPage: number;
    maxPages: number;
    batchSize: number;
    lastCycleStart: Date;
    lastFullAnalysis: Date | null;
    processPhase: string;
    isProcessing: boolean;
  }>) {
    await this.prisma.cryptoGemState.upsert({ 
      where: { id: 1 }, 
      update: updates, 
      create: { id: 1, currentPage: 1, maxPages: 20, batchSize: 100, ...updates } 
    });
  }

  async findGemsQuick() {
    const state = await this.getOrCreateState();
    
    // Page actuelle à analyser (cycle complet à travers toutes les pages)
    const currentPage = state.currentPage;
    console.log(`🔍 Analyse de la page ${currentPage}/${state.maxPages}`);
    
    const projects = await this.fetchMarketData(currentPage, 100);
    const gems = projects
      .filter((project) => project.market_cap < this.gemCriteria.maxMarketCap && project.market_cap_rank <= this.gemCriteria.maxRank && project.price_change_percentage_24h > 5)
      .map((project) => ({ ...project, gemScore: this.calculateGemScore(project) }))
      .filter((project) => (project.gemScore || 0) >= 40)
      .sort((a, b) => (b.gemScore || 0) - (a.gemScore || 0))
      .slice(0, 20);

    // Sauvegarder les gems trouvés
    for (const gem of gems) {
      await this.prisma.cryptoGemProject.upsert({
        where: { coinId: gem.id },
        update: { currentPrice: gem.current_price, priceChangePercentage24h: gem.price_change_percentage_24h, volume24h: gem.volume_24h, gemScore: gem.gemScore, lastUpdated: new Date() },
        create: { coinId: gem.id, symbol: gem.symbol, name: gem.name, currentPrice: gem.current_price, marketCap: gem.market_cap, marketCapRank: gem.market_cap_rank, priceChangePercentage24h: gem.price_change_percentage_24h, volume24h: gem.volume_24h, totalVolume: gem.total_volume, circulatingSupply: gem.circulating_supply, maxSupply: gem.max_supply, ath: gem.ath, athChangePercentage: gem.ath_change_percentage, gemScore: gem.gemScore, needsSentimentAnalysis: (gem.gemScore || 0) >= 50, lastUpdated: new Date() },
      });
    }

    // ✅ Incrémenter la page pour le prochain cycle
    const nextPage = currentPage >= state.maxPages ? 1 : currentPage + 1;
    const isNewCycle = nextPage === 1 && currentPage === state.maxPages;
    
    await this.updateState({ 
      currentPage: nextPage,
      lastCycleStart: isNewCycle ? new Date() : state.lastCycleStart,
      processPhase: isNewCycle ? "CYCLE_COMPLETE" : "FETCH",
      lastFullAnalysis: isNewCycle ? new Date() : state.lastFullAnalysis
    });
    
    console.log(`📄 Page ${currentPage} analysée → Prochaine: ${nextPage}${isNewCycle ? ' (nouveau cycle)' : ''}`);
    if (isNewCycle) {
      console.log(`🔄 Cycle complet terminé ! Redémarrage depuis la page 1`);
    }

    return gems;
  }

  async monitorProjects(projects: CryptoProject[]) {
    for (const project of projects) {
      if (project.price_change_percentage_24h > 50) {
        this.alerts.push({ type: "price", message: `${project.name} (${project.symbol}) +${project.price_change_percentage_24h.toFixed(2)}% en 24h!`, project: project.symbol, priority: "high", timestamp: new Date() });
      }
      const volumeRatio = project.total_volume / project.market_cap;
      if (volumeRatio > 0.2) {
        this.alerts.push({ type: "volume", message: `Volume inhabituel pour ${project.name}: ${(volumeRatio * 100).toFixed(2)}%`, project: project.symbol, priority: "medium", timestamp: new Date() });
      }
      if (project.gemScore && project.gemScore > 70) {
        this.alerts.push({ type: "gem", message: `Pépite détectée: ${project.name} (Score: ${project.gemScore})`, project: project.symbol, priority: "high", timestamp: new Date() });
      }
    }
  }

  async generateReport(gems: CryptoProject[]): Promise<CryptoGemReport> {
    const reportData: CryptoGemReport = { timestamp: new Date().toISOString(), totalGemsFound: gems.length, gems: gems.map((gem) => ({ name: gem.name, symbol: gem.symbol, price: gem.current_price, marketCap: gem.market_cap, priceChange24h: gem.price_change_percentage_24h, gemScore: gem.gemScore, sentiment: gem.socialSentiment, rank: gem.market_cap_rank })), alerts: this.alerts, telegramSent: false };

    console.log(`Rapport: ${gems.length} pépites`);

    if (gems.length > 0) {
      await this.saveGemProjectsToDB(gems);
      await this.saveAlertsToDB();
    }

    await this.prisma.$disconnect();
    return reportData;
  }

  async saveGemProjectsToDB(gems: CryptoProject[]) {
    for (const gem of gems) {
      await this.prisma.cryptoGemProject.upsert({
        where: { coinId: gem.id },
        update: { symbol: gem.symbol, name: gem.name, currentPrice: gem.current_price, marketCap: gem.market_cap, marketCapRank: gem.market_cap_rank, priceChangePercentage24h: gem.price_change_percentage_24h, volume24h: gem.volume_24h, totalVolume: gem.total_volume, circulatingSupply: gem.circulating_supply, maxSupply: gem.max_supply, ath: gem.ath, athChangePercentage: gem.ath_change_percentage, gemScore: gem.gemScore, sentimentScore: gem.socialSentiment?.score, sentimentMentions: gem.socialSentiment?.mentions, sentimentPositiveRatio: gem.socialSentiment?.positiveRatio, lastUpdated: new Date(), lastAnalyzed: new Date() },
        create: { coinId: gem.id, symbol: gem.symbol, name: gem.name, currentPrice: gem.current_price, marketCap: gem.market_cap, marketCapRank: gem.market_cap_rank, priceChangePercentage24h: gem.price_change_percentage_24h, volume24h: gem.volume_24h, totalVolume: gem.total_volume, circulatingSupply: gem.circulating_supply, maxSupply: gem.max_supply, ath: gem.ath, athChangePercentage: gem.ath_change_percentage, gemScore: gem.gemScore, sentimentScore: gem.socialSentiment?.score, sentimentMentions: gem.socialSentiment?.mentions, sentimentPositiveRatio: gem.socialSentiment?.positiveRatio, lastUpdated: new Date(), lastAnalyzed: new Date() },
      });
    }
  }

  async saveAlertsToDB() {
    for (const alert of this.alerts) {
      await this.prisma.cryptoGemAlert.create({ data: { type: alert.type, message: alert.message, project: alert.project, priority: alert.priority, createdAt: alert.timestamp } });
    }
  }

  async cleanupOldData() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await this.prisma.cryptoGemAlert.deleteMany({ where: { createdAt: { lt: oneDayAgo } } });
    await this.prisma.cryptoGemProject.deleteMany({ where: { AND: [{ lastUpdated: { lt: oneWeekAgo } }, { gemScore: { lt: 30 } }] } });
    await this.prisma.cryptoGemProject.updateMany({ where: { lastUpdated: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) } }, data: { needsSentimentAnalysis: true } });
  }

  async getSystemStats() {
    const state = await this.getOrCreateState();
    const totalProjects = await this.prisma.cryptoGemProject.count();
    const totalAlerts = await this.prisma.cryptoGemAlert.count();
    const highScoreGems = await this.prisma.cryptoGemProject.count({ where: { gemScore: { gte: 70 } } });
    const projectsNeedingAnalysis = await this.prisma.cryptoGemProject.count({ where: { needsSentimentAnalysis: true } });

    // Calculer les statistiques du cycle
    const cycleProgress = ((state.currentPage - 1) / state.maxPages * 100).toFixed(1);
    const timesSinceLastCycle = state.lastCycleStart ? 
      Math.floor((Date.now() - state.lastCycleStart.getTime()) / (1000 * 60)) : 0;

    return { 
      state, 
      totalProjects, 
      totalAlerts, 
      highScoreGems, 
      projectsNeedingAnalysis, 
      cycleProgress: `${cycleProgress}%`,
      minutesSinceLastCycle: timesSinceLastCycle,
      lastUpdate: new Date().toISOString() 
    };
  }

  async run() {
    try {
      await this.cleanupOldData();
      const systemStats = await this.getSystemStats();
      const gems = await this.findGemsQuick();
      await this.monitorProjects(gems);
      const report = await this.generateReport(gems);
      // Créer un nouvel objet qui combine le rapport et les stats système
      return { 
        success: true, 
        statusCode: 200, 
        data: { ...report, systemStats }, 
        message: `Analyse terminée: ${gems.length} pépites, ${this.alerts.length} alertes` 
      };
    } catch (error) {
      console.error("Erreur run:", error);
      return { success: false, statusCode: 500, error: error instanceof Error ? error.message : "unknown", message: "Erreur" };
    }
  }

  getAlerts() { return this.alerts; }
  getGemCriteria() { return this.gemCriteria; }
  setGemCriteria(criteria: Partial<GemCriteria>) { this.gemCriteria = { ...this.gemCriteria, ...criteria }; }
  setTelegramCooldown(hours: number) { this.telegramCooldownHours = Math.max(0.5, Math.min(72, hours)); }
  getTelegramCooldown() { return this.telegramCooldownHours; }
}
