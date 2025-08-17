import SocialMediaManager from '../infrastructure/external/socialMediaManager';
import { PrismaClient } from '@prisma/client';

interface FacebookPostRequest {
  type?: 'gems' | 'performance' | 'market' | 'custom';
  customMessage?: string;
  gemId?: string;
}

interface FacebookPostResult {
  success: boolean;
  message: string;
  postId?: string;
  timestamp: string;
}

export class FacebookService {
  private socialManager: SocialMediaManager;
  private prisma: PrismaClient;

  constructor() {
    this.socialManager = new SocialMediaManager({
      autoPost: true,
      gemScoreThreshold: 60,
      priceChangeThreshold: 10
    });
    this.prisma = new PrismaClient();
  }

  /**
   * Publie un post Facebook selon le type demandé
   */
  async createPost(request: FacebookPostRequest): Promise<FacebookPostResult> {
    try {
      let result: { success: boolean; message: string; postId?: string };

      switch (request.type) {
        case 'custom':
          if (!request.customMessage) {
            return {
              success: false,
              message: "Message personnalisé requis",
              timestamp: new Date().toISOString()
            };
          }
          
          result = await this.socialManager.postManually(request.customMessage);
          break;

        case 'gems':
          result = await this.socialManager.autoPostToFacebook('gems');
          break;

        case 'performance':
          result = await this.socialManager.autoPostToFacebook('performance');
          break;

        case 'market':
          result = await this.socialManager.autoPostToFacebook('market');
          break;

        default:
          // Par défaut, publier des pépites
          result = await this.socialManager.autoPostToFacebook('gems');
      }

      console.log(`✅ Publication Facebook: ${result.success ? 'réussie' : 'échouée'} - ${result.message}`);

      return {
        success: result.success,
        message: result.message,
        ...(result.postId && { postId: result.postId }),
        timestamp: new Date().toISOString()
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error("❌ Erreur lors de la publication Facebook:", errorMessage);

      return {
        success: false,
        message: "Erreur lors de la publication sur Facebook",
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Vérifie les alertes urgentes et publie si nécessaire
   */
  async checkAndPostUrgentAlerts(): Promise<FacebookPostResult> {
    try {
      await this.socialManager.checkForUrgentAlerts();
      
      return {
        success: true,
        message: "Vérification des alertes urgentes effectuée",
        timestamp: new Date().toISOString()
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error("❌ Erreur lors de la vérification des alertes urgentes:", errorMessage);
      
      return {
        success: false,
        message: "Erreur lors de la vérification des alertes urgentes",
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Récupère les statistiques Facebook pour le dashboard
   */
  async getStats(): Promise<{ 
    success: boolean; 
    data?: {
      postsToday: number;
      maxPostsPerDay: number;
      lastPostTime: Date | null;
      minTimeBetweenPosts: number;
      duplicateThreshold: number;
    }; 
    error?: string 
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Compter les posts d'aujourd'hui (filtre sur platforms contenant 'facebook')
      const postsToday = await this.prisma.cryptoSocialSignal.count({
        where: {
          platforms: {
            contains: 'facebook',
          },
          createdAt: {
            gte: today,
          },
        },
      });

      // Trouver le dernier post
      const lastPost = await this.prisma.cryptoSocialSignal.findFirst({
        where: {
          platforms: {
            contains: 'facebook',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Configuration anti-spam (correspond à SocialMediaManager)
      const maxPostsPerDay = 5;
      const minTimeBetweenPosts = 30; // minutes
      const duplicateThreshold = 0.8; // 80% de similarité

      return {
        success: true,
        data: {
          postsToday,
          maxPostsPerDay,
          lastPostTime: lastPost?.createdAt || null,
          minTimeBetweenPosts,
          duplicateThreshold,
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de la récupération des stats Facebook:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Ferme la connexion à la base de données
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
