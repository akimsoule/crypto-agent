import FacebookService from './Facebook';
import { PrismaClient } from '@prisma/client';

interface SocialPostConfig {
  platforms: string[];
  autoPost: boolean;
  postFrequency: 'hourly' | 'daily' | 'manual';
  gemScoreThreshold: number;
  priceChangeThreshold: number;
  minTimeBetweenPosts: number; // Minutes entre posts
  duplicateContentThreshold: number; // Seuil de similarité (0-1)
  maxPostsPerDay: number;
  cooldownPerCrypto: number; // Heures avant de reposter sur la même crypto
}

interface GemData {
  coinId: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChangePercentage24h: number;
  gemScore?: number;
  marketCap: number;
  marketCapRank: number;
}

interface InvestorPerformance {
  investor: {
    name: string;
    type: string;
  };
  totalReturnPercent: number;
  winRate: number;
  activePositions: number;
}

export class SocialMediaManager {
  private facebookService: FacebookService;
  private prisma: PrismaClient;
  private config: SocialPostConfig;

  constructor(config?: Partial<SocialPostConfig>) {
    this.facebookService = new FacebookService();
    this.prisma = new PrismaClient();
    
    this.config = {
      platforms: ['facebook'],
      autoPost: true,
      postFrequency: 'daily',
      gemScoreThreshold: 75,
      priceChangeThreshold: 20,
      minTimeBetweenPosts: 60, // 1 heure minimum entre posts
      duplicateContentThreshold: 0.8, // 80% de similarité = dupliqué
      maxPostsPerDay: 5, // Max 5 posts par jour
      cooldownPerCrypto: 24, // 24h avant reposter sur même crypto
      ...config
    };
  }

  /**
   * Générer un post pour une pépite crypto
   */
  private generateGemPost(gem: GemData): string {
    const emojis = this.selectEmojisBasedOnPerformance(gem.priceChangePercentage24h);
    
    return `${emojis.alert} ALERTE PÉPITE CRYPTO ${emojis.alert}

💎 ${gem.name} (${gem.symbol.toUpperCase()})
📈 +${gem.priceChangePercentage24h.toFixed(2)}% en 24h
⭐ Score Gem: ${gem.gemScore || 0}/100
💰 Market Cap: $${(gem.marketCap / 1000000).toFixed(2)}M
📊 Rang: #${gem.marketCapRank}

${this.generateInsight(gem)}

⚠️ Toujours faire ses propres recherches (DYOR)
📈 Surveillez cette crypto de près !

#CryptoGems #Trading #Crypto #Investment #DYOR #${gem.symbol.toUpperCase()} #CryptoAffiliate`;
  }

  /**
   * Générer un post de performance hebdomadaire
   */
  private async generatePerformancePost(): Promise<string> {
    const topInvestor = await this.getTopPerformingInvestor();
    const topGems = await this.getTopGemsOfWeek();

    return `🏆 PERFORMANCE DE LA SEMAINE 🏆

📊 Notre meilleur investisseur virtuel :
🤖 ${topInvestor?.investor?.name || 'AggressiveTrader'}
📈 Performance: +${topInvestor?.totalReturnPercent?.toFixed(2) || '0.00'}%
🎯 Taux de réussite: ${topInvestor?.winRate?.toFixed(1) || '0.0'}%
💼 ${topInvestor?.activePositions || 0} positions actives

🚀 Top 3 des pépites de la semaine :
${topGems.slice(0, 3).map((gem, i) => 
  `${i + 1}. ${gem.name} (+${gem.priceChangePercentage24h.toFixed(1)}%)`
).join('\n')}

Les stratégies diversifiées continuent de performer ! 

Découvrez toutes nos analyses sur notre plateforme 👆

#CryptoPerformance #Trading #Investment #CryptoAffiliate`;
  }

  /**
   * Générer un post d'analyse de marché
   */
  private async generateMarketAnalysisPost(): Promise<string> {
    const marketStats = await this.getMarketStats();
    
    return `📊 ANALYSE DE MARCHÉ - ${new Date().toLocaleDateString('fr-FR')}

🔍 Cryptos analysées aujourd'hui : ${marketStats.totalAnalyzed}
💎 Nouvelles pépites détectées : ${marketStats.newGems}
📈 Cryptos en hausse (>10%) : ${marketStats.cryptosUp}
📉 Cryptos en baisse (<-10%) : ${marketStats.cryptosDown}

💡 Insight du jour : ${marketStats.insight}

🎯 Focus sur : ${marketStats.topMover?.name || 'Bitcoin'}
Performance : ${marketStats.topMover?.change || '+0.00'}%

Restez connectés pour plus d'analyses ! 📈

#CryptoMarket #Analysis #CryptoAffiliate #MarketUpdate`;
  }

  /**
   * Vérifier si on peut publier (anti-spam)
   */
  private async canPost(): Promise<{ canPost: boolean; reason?: string }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Vérifier le nombre de posts aujourd'hui
      const postsToday = await this.prisma.cryptoSocialSignal.count({
        where: {
          publishedAt: { gte: oneDayAgo },
          isPublished: true,
          platforms: { contains: 'facebook' }
        }
      });

      if (postsToday >= this.config.maxPostsPerDay) {
        return { 
          canPost: false, 
          reason: `Limite quotidienne atteinte (${postsToday}/${this.config.maxPostsPerDay})` 
        };
      }

      // Vérifier le délai minimum entre posts
      const lastPost = await this.prisma.cryptoSocialSignal.findFirst({
        where: {
          isPublished: true,
          platforms: { contains: 'facebook' }
        },
        orderBy: { publishedAt: 'desc' }
      });

      if (lastPost) {
        const timeSinceLastPost = now.getTime() - new Date(lastPost.publishedAt!).getTime();
        const minInterval = this.config.minTimeBetweenPosts * 60 * 1000; // Conversion en ms

        if (timeSinceLastPost < minInterval) {
          const remainingMinutes = Math.ceil((minInterval - timeSinceLastPost) / (60 * 1000));
          return { 
            canPost: false, 
            reason: `Attendre ${remainingMinutes} minutes avant le prochain post` 
          };
        }
      }

      return { canPost: true };
    } catch (error) {
      console.error('❌ Erreur lors de la vérification anti-spam:', error);
      return { canPost: false, reason: 'Erreur de vérification' };
    }
  }

  /**
   * Vérifier si une crypto spécifique peut être postée (cooldown)
   */
  private async canPostAboutCrypto(coinId: string): Promise<{ canPost: boolean; reason?: string }> {
    try {
      const cooldownHours = this.config.cooldownPerCrypto;
      const cooldownTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

      const recentPostAboutCrypto = await this.prisma.cryptoSocialSignal.findFirst({
        where: {
          coinId,
          publishedAt: { gte: cooldownTime },
          isPublished: true,
          platforms: { contains: 'facebook' }
        },
        orderBy: { publishedAt: 'desc' }
      });

      if (recentPostAboutCrypto) {
        const hoursRemaining = Math.ceil(
          (cooldownTime.getTime() - new Date(recentPostAboutCrypto.publishedAt!).getTime()) / (60 * 60 * 1000)
        );
        return { 
          canPost: false, 
          reason: `Cooldown actif pour cette crypto (${Math.abs(hoursRemaining)}h restantes)` 
        };
      }

      return { canPost: true };
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du cooldown crypto:', error);
      return { canPost: false, reason: 'Erreur de vérification' };
    }
  }

  /**
   * Calculer la similarité entre deux textes (algorithme simple)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const uniqueWords1 = new Set(words1);
    const uniqueWords2 = new Set(words2);
    
    const intersection = new Set([...uniqueWords1].filter(w => uniqueWords2.has(w)));
    const union = new Set([...uniqueWords1, ...uniqueWords2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Vérifier si le contenu est similaire aux posts récents
   */
  private async isDuplicateContent(content: string): Promise<{ isDuplicate: boolean; similarity?: number }> {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      const recentPosts = await this.prisma.cryptoSocialSignal.findMany({
        where: {
          publishedAt: { gte: threeDaysAgo },
          isPublished: true,
          platforms: { contains: 'facebook' }
        },
        select: { content: true },
        orderBy: { publishedAt: 'desc' },
        take: 10 // Vérifier les 10 derniers posts
      });

      for (const post of recentPosts) {
        const similarity = this.calculateSimilarity(content, post.content);
        
        if (similarity >= this.config.duplicateContentThreshold) {
          return { 
            isDuplicate: true, 
            similarity: Math.round(similarity * 100) 
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de contenu dupliqué:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Générer des variations de contenu pour éviter la duplication
   */
  private generateContentVariations(baseContent: string, gem?: GemData): string {
    const variations = {
      openings: [
        '🚨 ALERTE PÉPITE CRYPTO 🚨',
        '💎 DÉCOUVERTE CRYPTO 💎',
        '⚡ OPPORTUNITÉ DÉTECTÉE ⚡',
        '🔥 CRYPTO EN FEU 🔥',
        '🚀 NOUVELLE PÉPITE 🚀'
      ],
      insights: [
        'Cette crypto montre des signaux très prometteurs !',
        'Un momentum exceptionnel détecté !',
        'Les volumes confirment l\'intérêt des investisseurs !',
        'Une opportunité à surveiller de près !',
        'Le sentiment social est très positif !',
        'Les indicateurs techniques sont alignés !',
        'Une cassure technique majeure en cours !',
        'Pattern haussier confirmé par les volumes !'
      ],
      closings: [
        '⚠️ Toujours faire ses propres recherches (DYOR)',
        '⚠️ Investissement à risque - DYOR obligatoire',
        '⚠️ Ne jamais investir plus que ce qu\'on peut perdre',
        '⚠️ Analyse technique - Pas un conseil financier'
      ]
    };

    // Sélectionner des variations aléatoirement
    const randomOpening = variations.openings[Math.floor(Math.random() * variations.openings.length)];
    const randomInsight = variations.insights[Math.floor(Math.random() * variations.insights.length)];
    const randomClosing = variations.closings[Math.floor(Math.random() * variations.closings.length)];

    if (gem) {
      return `${randomOpening}

💎 ${gem.name} (${gem.symbol.toUpperCase()})
📈 +${gem.priceChangePercentage24h.toFixed(2)}% en 24h
⭐ Score Gem: ${gem.gemScore || 0}/100
💰 Market Cap: $${(gem.marketCap / 1000000).toFixed(2)}M
📊 Rang: #${gem.marketCapRank}

${randomInsight}

${randomClosing}
📈 Surveillez cette crypto de près !

#CryptoGems #Trading #Crypto #Investment #DYOR #${gem.symbol.toUpperCase()} #CryptoAffiliate`;
    }

    return baseContent; // Fallback au contenu original
  }

  /**
   * Publier automatiquement sur Facebook selon le type de contenu (avec anti-spam)
   */
  async autoPostToFacebook(type: 'gems' | 'performance' | 'market' = 'gems'): Promise<{ success: boolean; message: string; postId?: string }> {
    if (!this.config.autoPost) {
      console.log('📢 Auto-post désactivé');
      return { success: false, message: 'Auto-post désactivé' };
    }

    // Vérification anti-spam globale
    const canPostCheck = await this.canPost();
    if (!canPostCheck.canPost) {
      console.log(`🚫 Publication bloquée: ${canPostCheck.reason}`);
      return { success: false, message: canPostCheck.reason || 'Publication bloquée' };
    }

    try {
      await this.facebookService.loadAccessToken();
      
      let message: string;
      let signalType: string;

      switch (type) {
        case 'gems': {
          const worthyGems = await this.getWorthyGems();
          if (worthyGems.length === 0) {
            console.log('💎 Aucune pépite digne d\'être postée');
            return { success: false, message: 'Aucune pépite digne d\'être postée' };
          }

          // Trouver une gem qui peut être postée (pas en cooldown)
          let availableGem: GemData | null = null;
          for (const gem of worthyGems) {
            const cryptoCheck = await this.canPostAboutCrypto(gem.coinId);
            if (cryptoCheck.canPost) {
              availableGem = gem;
              break;
            } else {
              console.log(`⏰ ${gem.name}: ${cryptoCheck.reason}`);
            }
          }

          if (!availableGem) {
            console.log('⏰ Toutes les pépites sont en cooldown');
            return { success: false, message: 'Toutes les pépites sont en cooldown' };
          }

          message = this.generateContentVariations('', availableGem);
          signalType = 'GEM_ALERT';
          
          // Vérifier la duplication de contenu
          const duplicateCheck = await this.isDuplicateContent(message);
          if (duplicateCheck.isDuplicate) {
            console.log(`📝 Contenu similaire détecté (${duplicateCheck.similarity}%), génération d'une variation...`);
            // Régénérer avec une variation différente
            message = this.generateContentVariations(message, availableGem);
            
            // Revérifier après variation
            const secondCheck = await this.isDuplicateContent(message);
            if (secondCheck.isDuplicate) {
              console.log('📝 Impossible de générer un contenu unique, publication annulée');
              return { success: false, message: 'Impossible de générer un contenu unique' };
            }
          }
          
          // Sauvegarder le signal social
          await this.saveSocialSignal({
            signalType,
            coinId: availableGem.coinId,
            title: `Alerte ${availableGem.name}`,
            content: message,
            hashtags: this.extractHashtags(message),
            sentiment: 'POSITIVE',
            platforms: ['facebook']
          });
          break;
        }

        case 'performance': {
          message = await this.generatePerformancePost();
          signalType = 'PERFORMANCE';
          
          // Vérifier la duplication
          const duplicateCheck = await this.isDuplicateContent(message);
          if (duplicateCheck.isDuplicate) {
            console.log(`📈 Post de performance similaire récent (${duplicateCheck.similarity}%), publication annulée`);
            return { success: false, message: 'Post de performance similaire récent' };
          }
          
          await this.saveSocialSignal({
            signalType,
            title: 'Performance hebdomadaire',
            content: message,
            hashtags: this.extractHashtags(message),
            sentiment: 'POSITIVE',
            platforms: ['facebook']
          });
          break;
        }

        case 'market': {
          message = await this.generateMarketAnalysisPost();
          signalType = 'MARKET_ANALYSIS';
          
          // Vérifier la duplication
          const duplicateCheck = await this.isDuplicateContent(message);
          if (duplicateCheck.isDuplicate) {
            console.log(`📊 Analyse de marché similaire récente (${duplicateCheck.similarity}%), publication annulée`);
            return { success: false, message: 'Analyse de marché similaire récente' };
          }
          
          await this.saveSocialSignal({
            signalType,
            title: 'Analyse de marché',
            content: message,
            hashtags: this.extractHashtags(message),
            sentiment: 'NEUTRAL',
            platforms: ['facebook']
          });
          break;
        }

        default:
          console.log('❌ Type de post non reconnu');
          return { success: false, message: 'Type de post non reconnu' };
      }

      const result = await this.facebookService.postOnPage(message);
      
      if (result.success) {
        console.log(`✅ Post Facebook publié avec succès (${type}), ID: ${result.postId}`);
        return { 
          success: true, 
          message: 'Publication réussie sur Facebook',
          postId: result.postId 
        };
      } else {
        console.error('❌ Échec de la publication Facebook:', result.error);
        return { 
          success: false, 
          message: result.error || 'Erreur lors de la publication'
        };
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de la publication Facebook:', errorMsg);
      return { 
        success: false, 
        message: errorMsg 
      };
    }
  }

  /**
   * Publier une alerte d'urgence pour une crypto exceptionnelle (avec anti-spam)
   */
  async postUrgentAlert(gem: GemData): Promise<void> {
    // Vérifications anti-spam même pour les alertes urgentes
    const canPostCheck = await this.canPost();
    if (!canPostCheck.canPost) {
      console.log(`🚫 Alerte urgente bloquée: ${canPostCheck.reason}`);
      return;
    }

    const cryptoCheck = await this.canPostAboutCrypto(gem.coinId);
    if (!cryptoCheck.canPost) {
      console.log(`� Alerte urgente pour ${gem.name} bloquée: ${cryptoCheck.reason}`);
      return;
    }

    const urgentVariations = [
      '�🚨🔥 ALERTE URGENTE 🔥🚨',
      '💥 EXPLOSION CRYPTO 💥',
      '🚀 OPPORTUNITÉ EXCEPTIONNELLE 🚀',
      '⚡ CRYPTO EN ÉRUPTION ⚡'
    ];

    const randomOpening = urgentVariations[Math.floor(Math.random() * urgentVariations.length)];

    const message = `${randomOpening}

💥 ${gem.name} (${gem.symbol.toUpperCase()}) EXPLOSE !
🚀 +${gem.priceChangePercentage24h.toFixed(2)}% en 24h !

Cette performance est exceptionnelle ! 
⚡ Ne ratez pas cette opportunité !

⚠️ TOUJOURS DYOR avant d'investir !

#UrgentAlert #CryptoExplosion #${gem.symbol.toUpperCase()} #CryptoAffiliate`;

    // Vérifier la duplication même pour les urgences
    const duplicateCheck = await this.isDuplicateContent(message);
    if (duplicateCheck.isDuplicate) {
      console.log(`📝 Alerte urgente similaire récente pour ${gem.name} (${duplicateCheck.similarity}%), publication annulée`);
      return;
    }

    try {
      await this.facebookService.loadAccessToken();
      await this.facebookService.postOnPage(message);
      
      await this.saveSocialSignal({
        signalType: 'URGENT_ALERT',
        coinId: gem.coinId,
        title: `Alerte urgente ${gem.name}`,
        content: message,
        hashtags: this.extractHashtags(message),
        sentiment: 'POSITIVE',
        platforms: ['facebook']
      });

      console.log(`🚨 Alerte urgente postée pour ${gem.name}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'alerte urgente:', error);
    }
  }

  /**
   * Méthodes utilitaires privées
   */
  private selectEmojisBasedOnPerformance(change: number) {
    if (change > 50) return { alert: '🚨🔥', trend: '🚀' };
    if (change > 20) return { alert: '⚡', trend: '📈' };
    return { alert: '💎', trend: '📊' };
  }

  private generateInsight(gem: GemData): string {
    const insights = [
      "Cette crypto montre des signaux très prometteurs !",
      "Un momentum exceptionnel détecté !",
      "Les volumes confirment l'intérêt des investisseurs !",
      "Une opportunité à surveiller de près !",
      "Le sentiment social est très positif !",
      "Les indicateurs techniques sont alignés !",
      "Une cassure technique majeure en cours !",
    ];
    
    // Sélectionner un insight basé sur le score gem
    const index = gem.gemScore ? Math.floor((gem.gemScore / 100) * insights.length) : 0;
    return insights[Math.min(index, insights.length - 1)];
  }

  private extractHashtags(message: string): string[] {
    const hashtagRegex = /#\w+/g;
    return message.match(hashtagRegex) || [];
  }

  private async getWorthyGems(): Promise<GemData[]> {
    const gems = await this.prisma.cryptoGemProject.findMany({
      where: {
        OR: [
          { gemScore: { gte: this.config.gemScoreThreshold } },
          { priceChangePercentage24h: { gte: this.config.priceChangeThreshold } }
        ],
        lastUpdated: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
        }
      },
      orderBy: [
        { gemScore: 'desc' },
        { priceChangePercentage24h: 'desc' }
      ],
      take: 5
    });

    return gems.map(gem => ({
      coinId: gem.coinId,
      symbol: gem.symbol,
      name: gem.name,
      currentPrice: gem.currentPrice,
      priceChangePercentage24h: gem.priceChangePercentage24h,
      gemScore: gem.gemScore || undefined,
      marketCap: gem.marketCap,
      marketCapRank: gem.marketCapRank
    }));
  }

  private async getTopPerformingInvestor(): Promise<InvestorPerformance | null> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await this.prisma.cryptoPortfolioSnapshot.findFirst({
      where: {
        timestamp: { gte: sevenDaysAgo }
      },
      include: { investor: true },
      orderBy: { totalReturnPercent: 'desc' }
    });

    if (!result) return null;

    return {
      investor: {
        name: result.investor.name,
        type: result.investor.type
      },
      totalReturnPercent: result.totalReturnPercent,
      winRate: result.winRate,
      activePositions: result.activePositions
    };
  }

  private async getTopGemsOfWeek() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await this.prisma.cryptoGemProject.findMany({
      where: {
        lastUpdated: { gte: sevenDaysAgo },
        priceChangePercentage24h: { gt: 5 }
      },
      orderBy: { priceChangePercentage24h: 'desc' },
      take: 5
    });
  }

  private async getMarketStats() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const [totalAnalyzed, newGems, cryptosUp, cryptosDown, topMover] = await Promise.all([
      this.prisma.cryptoGemProject.count({
        where: { lastAnalyzed: { gte: oneDayAgo } }
      }),
      this.prisma.cryptoGemProject.count({
        where: { 
          lastUpdated: { gte: oneDayAgo },
          gemScore: { gte: 60 }
        }
      }),
      this.prisma.cryptoGemProject.count({
        where: { 
          lastUpdated: { gte: oneDayAgo },
          priceChangePercentage24h: { gte: 10 }
        }
      }),
      this.prisma.cryptoGemProject.count({
        where: { 
          lastUpdated: { gte: oneDayAgo },
          priceChangePercentage24h: { lte: -10 }
        }
      }),
      this.prisma.cryptoGemProject.findFirst({
        where: { lastUpdated: { gte: oneDayAgo } },
        orderBy: { priceChangePercentage24h: 'desc' }
      })
    ]);

    const insights = [
      "Le marché montre des signes de reprise !",
      "Volatilité élevée, opportunités présentes !",
      "Les altcoins montrent de belles performances !",
      "Prudence recommandée, marché incertain.",
      "Excellent moment pour la recherche de gems !",
    ];

    return {
      totalAnalyzed,
      newGems,
      cryptosUp,
      cryptosDown,
      topMover: topMover ? {
        name: topMover.name,
        change: topMover.priceChangePercentage24h.toFixed(2)
      } : null,
      insight: insights[Math.floor(Math.random() * insights.length)]
    };
  }

  private async saveSocialSignal(signal: {
    signalType: string;
    coinId?: string;
    title: string;
    content: string;
    hashtags: string[];
    sentiment: string;
    platforms: string[];
  }) {
    await this.prisma.cryptoSocialSignal.create({
      data: {
        signalType: signal.signalType,
        coinId: signal.coinId,
        title: signal.title,
        content: signal.content,
        hashtags: JSON.stringify(signal.hashtags),
        sentiment: signal.sentiment,
        platforms: JSON.stringify(signal.platforms),
        isPublished: true,
        publishedAt: new Date()
      }
    });
  }

  /**
   * Vérifier si une alerte urgente doit être envoyée (avec anti-spam renforcé)
   */
  async checkForUrgentAlerts(): Promise<void> {
    // Vérification globale stricte pour les urgences
    const canPostCheck = await this.canPost();
    if (!canPostCheck.canPost) {
      console.log(`🚫 Vérification d'alertes urgentes bloquée: ${canPostCheck.reason}`);
      return;
    }

    const urgentGems = await this.prisma.cryptoGemProject.findMany({
      where: {
        priceChangePercentage24h: { gte: 100 }, // +100% en 24h
        lastUpdated: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Dernière heure
        }
      },
      orderBy: { priceChangePercentage24h: 'desc' },
      take: 3 // Augmenter légèrement pour avoir des alternatives
    });

    if (urgentGems.length === 0) {
      console.log('🔍 Aucune crypto avec performance urgente détectée');
      return;
    }

    for (const gem of urgentGems) {
      // Cooldown spécial pour les urgences (3h au lieu de 6h)
      const urgentCooldown = new Date(Date.now() - 3 * 60 * 60 * 1000);
      
      const recentAlert = await this.prisma.cryptoSocialSignal.findFirst({
        where: {
          coinId: gem.coinId,
          signalType: 'URGENT_ALERT',
          publishedAt: { gte: urgentCooldown }
        }
      });

      if (!recentAlert) {
        // Vérifier aussi les posts normaux récents pour cette crypto
        const recentNormalPost = await this.prisma.cryptoSocialSignal.findFirst({
          where: {
            coinId: gem.coinId,
            publishedAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000) // Dernière heure
            }
          }
        });

        if (!recentNormalPost) {
          const gemData: GemData = {
            coinId: gem.coinId,
            symbol: gem.symbol,
            name: gem.name,
            currentPrice: gem.currentPrice,
            priceChangePercentage24h: gem.priceChangePercentage24h,
            gemScore: gem.gemScore || undefined,
            marketCap: gem.marketCap,
            marketCapRank: gem.marketCapRank
          };

          console.log(`🚨 Alerte urgente déclenchée pour ${gem.name} (+${gem.priceChangePercentage24h.toFixed(2)}%)`);
          await this.postUrgentAlert(gemData);
          
          // Publier seulement la première urgence trouvée
          break;
        } else {
          console.log(`⏰ ${gem.name}: Post récent déjà effectué`);
        }
      } else {
        const hoursRemaining = Math.ceil((urgentCooldown.getTime() - new Date(recentAlert.publishedAt!).getTime()) / (60 * 60 * 1000));
        console.log(`⏰ ${gem.name}: Alerte urgente en cooldown (${Math.abs(hoursRemaining)}h restantes)`);
      }
    }
  }

  /**
   * Méthode publique pour poster manuellement (avec anti-spam)
   */
  async postManually(message: string): Promise<{ success: boolean; message: string; postId?: string }> {
    // Vérifications anti-spam pour les posts manuels
    const canPostCheck = await this.canPost();
    if (!canPostCheck.canPost) {
      console.log(`🚫 Post manuel bloqué: ${canPostCheck.reason}`);
      return { success: false, message: `Publication bloquée: ${canPostCheck.reason || 'Raison inconnue'}` };
    }

    const duplicateCheck = await this.isDuplicateContent(message);
    if (duplicateCheck.isDuplicate) {
      console.log(`📝 Contenu similaire détecté (${duplicateCheck.similarity}%)`);
      return { success: false, message: `Contenu trop similaire à un post récent (${duplicateCheck.similarity}%)` };
    }

    try {
      await this.facebookService.loadAccessToken();
      const result = await this.facebookService.postOnPage(message);
      
      if (!result.success) {
        return { success: false, message: result.error || 'Erreur lors de la publication' };
      }

      await this.saveSocialSignal({
        signalType: 'MANUAL',
        title: 'Post manuel',
        content: message,
        hashtags: this.extractHashtags(message),
        sentiment: 'NEUTRAL',
        platforms: ['facebook']
      });

      console.log('✅ Post manuel publié avec succès');
      return { 
        success: true, 
        message: 'Post manuel publié avec succès',
        postId: result.postId 
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors du post manuel:', errorMsg);
      return { 
        success: false, 
        message: errorMsg 
      };
    }
  }

  /**
   * Obtenir les statistiques anti-spam
   */
  async getSpamStats(): Promise<{
    postsToday: number;
    maxPostsPerDay: number;
    lastPostTime: Date | null;
    minTimeBetweenPosts: number;
    duplicateThreshold: number;
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const postsToday = await this.prisma.cryptoSocialSignal.count({
      where: {
        publishedAt: { gte: oneDayAgo },
        isPublished: true,
        platforms: { contains: 'facebook' }
      }
    });

    const lastPost = await this.prisma.cryptoSocialSignal.findFirst({
      where: {
        isPublished: true,
        platforms: { contains: 'facebook' }
      },
      orderBy: { publishedAt: 'desc' }
    });

    return {
      postsToday,
      maxPostsPerDay: this.config.maxPostsPerDay,
      lastPostTime: lastPost?.publishedAt || null,
      minTimeBetweenPosts: this.config.minTimeBetweenPosts,
      duplicateThreshold: this.config.duplicateContentThreshold
    };
  }
}

export default SocialMediaManager;
