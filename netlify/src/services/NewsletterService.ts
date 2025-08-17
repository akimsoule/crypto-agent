import { PrismaClient } from "@prisma/client";
import { ResendService } from './ResendService';
import { WelcomeEmailProps } from '../templates/WelcomeEmail';
import { TestEmailProps } from '../templates/TestEmail';

interface SubscriptionRequest {
  email: string;
  source?: string;
  preferences?: Record<string, unknown>;
}

interface SubscriptionResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    email: string;
    isActive: boolean;
    createdAt: string;
  };
}

interface GetSubscriptionsParams {
  page: number;
  limit: number;
  status?: 'active' | 'inactive' | 'all';
  search?: string;
}

interface NewsletterSubscription {
  id: number;
  email: string;
  isActive: boolean;
  source: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
}

interface GetSubscriptionsResult {
  success: boolean;
  data?: {
    subscriptions: NewsletterSubscription[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

interface NewsletterContent {
  subject: string;
  html: string;
  text: string;
}

interface SendNewsletterResult {
  success: boolean;
  message: string;
  data?: {
    totalSubscribers: number;
    emailsSent: number;
    failed: number;
    errors: string[];
  };
  error?: string;
}

export class NewsletterService {
  private prisma: PrismaClient;
  private resendService: ResendService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.resendService = new ResendService();
  }

  /**
   * Valide un format d'email
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Abonne un email à la newsletter
   */
  async subscribe(request: SubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      if (!request.email) {
        return {
          success: false,
          message: "Email requis",
        };
      }

      // Validation de l'email
      if (!this.validateEmail(request.email)) {
        return {
          success: false,
          message: "Format d'email invalide",
        };
      }

      const email = request.email.toLowerCase().trim();

      // Vérifier si l'email existe déjà
      const existingSubscription = await this.prisma.newsletterSubscription.findUnique({
        where: { email },
      });

      if (existingSubscription) {
        if (existingSubscription.isActive) {
          return {
            success: false,
            message: "Cet email est déjà abonné à la newsletter",
          };
        } else {
          // Réactiver l'abonnement
          const updatedSubscription = await this.prisma.newsletterSubscription.update({
            where: { email },
            data: {
              isActive: true,
              source: request.source || "website",
              preferences: request.preferences ? JSON.stringify(request.preferences) : null,
              confirmedAt: new Date(),
            },
          });

          return {
            success: true,
            message: "Abonnement réactivé avec succès ! Vérifiez votre email pour la confirmation.",
            data: {
              id: updatedSubscription.id,
              email: updatedSubscription.email,
              isActive: updatedSubscription.isActive,
              createdAt: updatedSubscription.createdAt.toISOString(),
            },
          };
        }
      }

      // Créer un nouvel abonnement
      const subscription = await this.prisma.newsletterSubscription.create({
        data: {
          email,
          source: request.source || "website",
          preferences: request.preferences ? JSON.stringify(request.preferences) : null,
          isActive: true,
          confirmedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Inscription réussie ! Merci de vous être abonné à notre newsletter.",
        data: {
          id: subscription.id,
          email: subscription.email,
          isActive: subscription.isActive,
          createdAt: subscription.createdAt.toISOString(),
        },
      };

    } catch (error) {
      console.error("Erreur lors de l'abonnement:", error);
      return {
        success: false,
        message: "Erreur lors de l'inscription",
      };
    }
  }

  /**
   * Envoie un email de bienvenue à un nouvel abonné
   */
  async sendWelcomeEmail(email: string, recipientName?: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      if (!this.validateEmail(email)) {
        return {
          success: false,
          message: "Format d'email invalide",
        };
      }

      const welcomeData: WelcomeEmailProps = {
        recipientEmail: email,
        recipientName,
        websiteUrl: process.env.WEBSITE_URL || 'https://crypto-investors-hub.netlify.app',
        unsubscribeUrl: `${process.env.WEBSITE_URL || 'https://crypto-investors-hub.netlify.app'}/api/unsubscribe?email=${encodeURIComponent(email)}`
      };

      const result = await this.resendService.sendWelcomeEmail(welcomeData);

      if (result.success) {
        return {
          success: true,
          message: "Email de bienvenue envoyé avec succès"
        };
      } else {
        return {
          success: false,
          message: result.message,
          error: result.error
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de l\'envoi de l\'email de bienvenue:', error);
      
      return {
        success: false,
        message: "Erreur lors de l'envoi de l'email de bienvenue",
        error: errorMessage
      };
    }
  }

  /**
   * Récupère la liste des abonnements avec pagination et filtres
   */
  async getSubscriptions(params: GetSubscriptionsParams): Promise<GetSubscriptionsResult> {
    try {
      const { page, limit, status, search } = params;
      const skip = (page - 1) * limit;

      // Construire les conditions de filtrage
      interface WhereCondition {
        isActive?: boolean;
        email?: {
          contains: string;
          mode: 'insensitive';
        };
      }

      const where: WhereCondition = {};

      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }
      // Pour 'all', pas de filtre sur isActive

      if (search) {
        where.email = {
          contains: search,
          mode: 'insensitive'
        };
      }

      // Compter le total
      const total = await this.prisma.newsletterSubscription.count({ where });

      // Récupérer les abonnements avec pagination
      const subscriptions = await this.prisma.newsletterSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          isActive: true,
          source: true,
          createdAt: true,
          confirmedAt: true,
          unsubscribedAt: true,
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          subscriptions,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      };

    } catch (error) {
      console.error("Erreur lors de la récupération des abonnements:", error);
      return {
        success: false,
        error: "Erreur lors de la récupération des abonnements",
      };
    }
  }

  /**
   * Désabonne un email de la newsletter
   */
  async unsubscribe(email: string): Promise<SubscriptionResponse> {
    try {
      if (!email) {
        return {
          success: false,
          message: "Email requis",
        };
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Vérifier si l'abonnement existe
      const subscription = await this.prisma.newsletterSubscription.findUnique({
        where: { email: normalizedEmail },
      });

      if (!subscription) {
        return {
          success: false,
          message: "Aucun abonnement trouvé pour cet email",
        };
      }

      if (!subscription.isActive) {
        return {
          success: false,
          message: "Cet email n'est pas abonné à la newsletter",
        };
      }

      // Désactiver l'abonnement
      const updatedSubscription = await this.prisma.newsletterSubscription.update({
        where: { email: normalizedEmail },
        data: {
          isActive: false,
          unsubscribedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Désabonnement effectué avec succès",
        data: {
          id: updatedSubscription.id,
          email: updatedSubscription.email,
          isActive: updatedSubscription.isActive,
          createdAt: updatedSubscription.createdAt.toISOString(),
        },
      };

    } catch (error) {
      console.error("Erreur lors du désabonnement:", error);
      return {
        success: false,
        message: "Erreur lors du désabonnement",
      };
    }
  }

  /**
   * Récupère un abonnement par email
   */
  async getSubscriptionByEmail(email: string): Promise<{
    id: number;
    email: string;
    isActive: boolean;
    createdAt: Date;
    preferences: string | null;
  } | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const subscription = await this.prisma.newsletterSubscription.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          isActive: true,
          createdAt: true,
          preferences: true,
        },
      });

      return subscription;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'abonnement:", error);
      return null;
    }
  }

  /**
   * Met à jour les préférences d'un abonné
   */
  async updatePreferences(email: string, preferences: Record<string, unknown>): Promise<SubscriptionResponse> {
    try {
      if (!email) {
        return {
          success: false,
          message: "Email requis",
        };
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Vérifier si l'abonnement existe
      const subscription = await this.prisma.newsletterSubscription.findUnique({
        where: { email: normalizedEmail },
      });

      if (!subscription) {
        return {
          success: false,
          message: "Aucun abonnement trouvé pour cet email",
        };
      }

      // Mettre à jour les préférences
      const updatedSubscription = await this.prisma.newsletterSubscription.update({
        where: { email: normalizedEmail },
        data: {
          preferences: JSON.stringify(preferences),
        },
      });

      return {
        success: true,
        message: "Préférences mises à jour avec succès",
        data: {
          id: updatedSubscription.id,
          email: updatedSubscription.email,
          isActive: updatedSubscription.isActive,
          createdAt: updatedSubscription.createdAt.toISOString(),
        },
      };

    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences:", error);
      return {
        success: false,
        message: "Erreur lors de la mise à jour des préférences",
      };
    }
  }

  /**
   * Envoie une newsletter à tous les abonnés actifs
   */
  async sendNewsletter(content: NewsletterContent): Promise<SendNewsletterResult> {
    try {
      // Récupérer les abonnés actifs
      const subscribers = await this.prisma.newsletterSubscription.findMany({
        where: {
          isActive: true,
          bounced: false,
        },
        select: {
          email: true,
          preferences: true,
        },
      });

      if (subscribers.length === 0) {
        return {
          success: false,
          message: "Aucun abonné actif trouvé",
          data: {
            totalSubscribers: 0,
            emailsSent: 0,
            failed: 0,
            errors: []
          }
        };
      }

      console.log(`📧 Début d'envoi à ${subscribers.length} abonnés...`);

      // Simuler l'envoi d'emails (à remplacer par un vrai service d'envoi)
      let emailsSent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Traitement par batch pour éviter la surcharge
      const batchSize = 50;
      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        
        for (const subscriber of batch) {
          try {
            // Ici on appellerait un service d'envoi d'email (SendGrid, AWS SES, etc.)
            // Pour l'instant, on simule
            await this.sendEmailToSubscriber(subscriber.email, content);
            
            // Mettre à jour les statistiques de l'abonné
            await this.prisma.newsletterSubscription.update({
              where: { email: subscriber.email },
              data: {
                lastEmailSent: new Date(),
                emailsSent: { increment: 1 }
              }
            });
            
            emailsSent++;
          } catch (error) {
            failed++;
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            errors.push(`${subscriber.email}: ${errorMessage}`);
            console.error(`❌ Erreur envoi à ${subscriber.email}:`, error);
          }
        }

        // Pause entre les batches pour éviter la surcharge
        if (i + batchSize < subscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ Envoi terminé: ${emailsSent} succès, ${failed} échecs`);

      return {
        success: true,
        message: `Newsletter envoyée avec succès à ${emailsSent}/${subscribers.length} abonnés`,
        data: {
          totalSubscribers: subscribers.length,
          emailsSent,
          failed,
          errors
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error("❌ Erreur lors de l'envoi de la newsletter:", error);
      
      return {
        success: false,
        message: "Erreur lors de l'envoi de la newsletter",
        error: errorMessage
      };
    }
  }

  /**
   * Envoie un email à un abonné spécifique avec Resend
   */
  private async sendEmailToSubscriber(email: string, content: NewsletterContent): Promise<void> {
    // Pour cette méthode privée, on utilise directement le contenu fourni
    const result = await this.resendService.sendEmail({
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    if (!result.success) {
      throw new Error(result.error || result.message);
    }
  }

  /**
   * Génère le contenu de la newsletter automatiquement
   */
  async generateNewsletterContent(): Promise<NewsletterContent> {
    try {
      // Récupérer les meilleurs gems récents
      const recentGems = await this.prisma.cryptoGemProject.findMany({
        where: {
          gemScore: { gte: 70 },
          lastUpdated: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 jours
          }
        },
        orderBy: [
          { gemScore: 'desc' },
          { priceChangePercentage24h: 'desc' }
        ],
        take: 5
      });

      // Récupérer les alertes récentes
      const recentAlerts = await this.prisma.cryptoGemAlert.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      });

      const subject = `🚀 Weekly Crypto Gems Report - ${new Date().toLocaleDateString('fr-FR')}`;
      
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #2196F3;">🚀 Weekly Crypto Gems Report</h1>
            
            <h2>💎 Top Gems This Week</h2>
            ${recentGems.length > 0 ? recentGems.map(gem => `
              <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <h3>${gem.name} (${gem.symbol})</h3>
                <p><strong>Score:</strong> ${gem.gemScore}/100</p>
                <p><strong>Prix:</strong> $${gem.currentPrice}</p>
                <p><strong>Variation 24h:</strong> ${gem.priceChangePercentage24h?.toFixed(2)}%</p>
              </div>
            `).join('') : '<p>Aucun gem notable cette semaine.</p>'}
            
            <h2>🚨 Alertes Récentes</h2>
            ${recentAlerts.length > 0 ? recentAlerts.map(alert => `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 3px;">
                <strong>${alert.type}:</strong> ${alert.message}
              </div>
            `).join('') : '<p>Aucune alerte récente.</p>'}
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              Vous recevez cet email car vous êtes abonné à notre newsletter.
              <a href="mailto:unsubscribe@example.com">Se désabonner</a>
            </p>
          </body>
        </html>
      `;

      const text = `
🚀 Weekly Crypto Gems Report - ${new Date().toLocaleDateString('fr-FR')}

💎 Top Gems This Week:
${recentGems.length > 0 ? recentGems.map(gem => 
  `- ${gem.name} (${gem.symbol}): Score ${gem.gemScore}/100, Prix $${gem.currentPrice}, Variation 24h: ${gem.priceChangePercentage24h?.toFixed(2)}%`
).join('\n') : 'Aucun gem notable cette semaine.'}

🚨 Alertes Récentes:
${recentAlerts.length > 0 ? recentAlerts.map(alert => 
  `- ${alert.type}: ${alert.message}`
).join('\n') : 'Aucune alerte récente.'}

---
Vous recevez cet email car vous êtes abonné à notre newsletter.
Pour vous désabonner, répondez à cet email avec "UNSUBSCRIBE".
      `;

      return { subject, html, text };

    } catch (error) {
      console.error("❌ Erreur lors de la génération du contenu:", error);
      
      // Contenu par défaut en cas d'erreur
      return {
        subject: "🚀 Crypto Gems Newsletter",
        html: "<html><body><h1>Newsletter temporairement indisponible</h1><p>Nous rencontrons des difficultés techniques. Merci de votre patience.</p></body></html>",
        text: "Newsletter temporairement indisponible. Nous rencontrons des difficultés techniques. Merci de votre patience."
      };
    }
  }

  /**
   * Envoie un email de test avec Resend
   */
  async sendTestEmail(toEmail: string, testMessage?: string): Promise<{
    success: boolean;
    message: string;
    timestamp?: string;
    error?: string;
  }> {
    try {
      // Validation de l'email
      if (!toEmail) {
        return {
          success: false,
          message: "Email destinataire requis",
        };
      }

      if (!this.validateEmail(toEmail)) {
        return {
          success: false,
          message: "Format d'email invalide",
        };
      }

      // Vérifier la configuration Resend
      const configResult = await this.resendService.validateConfiguration();
      if (!configResult.success) {
        return {
          success: false,
          message: configResult.message,
          error: configResult.error
        };
      }

      // Préparer les données du template de test
      const testData: TestEmailProps = {
        recipientEmail: toEmail,
        testMessage,
        timestamp: new Date().toLocaleString('fr-FR'),
        websiteUrl: process.env.WEBSITE_URL || 'https://crypto-investors-hub.netlify.app',
        unsubscribeUrl: `${process.env.WEBSITE_URL || 'https://crypto-investors-hub.netlify.app'}/api/unsubscribe?email=${encodeURIComponent(toEmail)}`
      };

      // Envoyer l'email de test
      const result = await this.resendService.sendTestEmail(testData);

      if (result.success) {
        return {
          success: true,
          message: `Email de test envoyé avec succès à ${toEmail}`,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          message: result.message,
          error: result.error
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de l\'envoi de l\'email de test:', error);
      
      return {
        success: false,
        message: "Erreur lors de l'envoi de l'email de test",
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
