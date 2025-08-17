import { Resend } from 'resend';
import { EmailRenderer } from '../templates/EmailRenderer';
import { NewsletterEmailProps } from '../templates/NewsletterEmail';
import { WelcomeEmailProps } from '../templates/WelcomeEmail';
import { TestEmailProps } from '../templates/TestEmail';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

export class ResendService {
  private resend: Resend;
  private defaultFrom: string;
  private defaultReplyTo: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    this.resend = new Resend(apiKey);
    this.defaultFrom = process.env.RESEND_FROM_EMAIL || 'Crypto Investors Hub <newsletter@crypto-investors-hub.com>';
    this.defaultReplyTo = process.env.RESEND_REPLY_TO || 'noreply@crypto-investors-hub.com';
  }

  /**
   * Envoie un email générique
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || this.defaultReplyTo,
      });

      if (error) {
        console.error('❌ Erreur Resend:', error);
        return {
          success: false,
          message: 'Erreur lors de l\'envoi de l\'email',
          error: error.message || 'Erreur inconnue'
        };
      }

      console.log('✅ Email envoyé avec succès:', data?.id);
      return {
        success: true,
        message: 'Email envoyé avec succès',
        messageId: data?.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
      
      return {
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email',
        error: errorMessage
      };
    }
  }

  /**
   * Envoie la newsletter hebdomadaire
   */
  async sendNewsletter(data: NewsletterEmailProps): Promise<SendEmailResult> {
    try {
      const template = await EmailRenderer.renderNewsletter(data);
      
      return await this.sendEmail({
        to: data.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de l\'envoi de la newsletter:', error);
      
      return {
        success: false,
        message: 'Erreur lors de l\'envoi de la newsletter',
        error: errorMessage
      };
    }
  }

  /**
   * Envoie un email de bienvenue
   */
  async sendWelcomeEmail(data: WelcomeEmailProps): Promise<SendEmailResult> {
    try {
      const template = await EmailRenderer.renderWelcome(data);
      
      return await this.sendEmail({
        to: data.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de l\'envoi de l\'email de bienvenue:', error);
      
      return {
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email de bienvenue',
        error: errorMessage
      };
    }
  }

  /**
   * Envoie un email de test
   */
  async sendTestEmail(data: TestEmailProps): Promise<SendEmailResult> {
    try {
      const template = await EmailRenderer.renderTest(data);
      
      return await this.sendEmail({
        to: data.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de l\'envoi de l\'email de test:', error);
      
      return {
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email de test',
        error: errorMessage
      };
    }
  }

  /**
   * Envoie des emails en batch (pour la newsletter massive)
   */
  async sendBatchEmails(emails: SendEmailOptions[]): Promise<{
    success: boolean;
    results: Array<{ email: string; success: boolean; messageId?: string; error?: string }>;
    totalSent: number;
    totalFailed: number;
  }> {
    const results: Array<{ email: string; success: boolean; messageId?: string; error?: string }> = [];
    let totalSent = 0;
    let totalFailed = 0;

    try {
      // Traitement par batch pour éviter la surcharge
      const batchSize = 10; // Resend recommande de ne pas dépasser 10 emails simultanés
      
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (email) => {
          const emailAddress = Array.isArray(email.to) ? email.to[0] : email.to;
          
          try {
            const result = await this.sendEmail(email);
            
            if (result.success) {
              totalSent++;
              return {
                email: emailAddress,
                success: true,
                messageId: result.messageId
              };
            } else {
              totalFailed++;
              return {
                email: emailAddress,
                success: false,
                error: result.error || result.message
              };
            }
          } catch (error) {
            totalFailed++;
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            return {
              email: emailAddress,
              success: false,
              error: errorMessage
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Pause entre les batches pour respecter les limites de taux
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`📧 Envoi batch terminé: ${totalSent} succès, ${totalFailed} échecs`);

      return {
        success: true,
        results,
        totalSent,
        totalFailed
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi batch:', error);
      
      return {
        success: false,
        results,
        totalSent,
        totalFailed
      };
    }
  }

  /**
   * Valide la configuration Resend
   */
  async validateConfiguration(): Promise<{
    success: boolean;
    message: string;
    details?: {
      apiKeyConfigured: boolean;
      fromEmailConfigured: boolean;
      replyToConfigured: boolean;
    };
    error?: string;
  }> {
    try {
      const apiKeyConfigured = !!process.env.RESEND_API_KEY;
      const fromEmailConfigured = !!this.defaultFrom;
      const replyToConfigured = !!this.defaultReplyTo;

      if (!apiKeyConfigured) {
        return {
          success: false,
          message: 'Configuration Resend incomplète',
          details: {
            apiKeyConfigured,
            fromEmailConfigured,
            replyToConfigured
          },
          error: 'RESEND_API_KEY manquante'
        };
      }

      // Test avec un appel simple à l'API (sans envoyer d'email)
      // Note: Resend n'a pas d'endpoint de validation, donc on vérifie juste les variables d'environnement
      
      return {
        success: true,
        message: 'Configuration Resend valide',
        details: {
          apiKeyConfigured,
          fromEmailConfigured,
          replyToConfigured
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      return {
        success: false,
        message: 'Erreur lors de la validation de la configuration',
        error: errorMessage
      };
    }
  }

  /**
   * Obtient les statistiques d'envoi (si supporté par Resend)
   */
  async getEmailStats(): Promise<{
    success: boolean;
    stats?: {
      sent: number;
      delivered: number;
      bounced: number;
      complained: number;
    };
    message: string;
  }> {
    try {
      // Note: Resend pourrait ne pas avoir d'API de statistiques publique
      // Cette méthode est préparée pour une future implémentation
      
      return {
        success: true,
        message: 'Statistiques non disponibles avec l\'API actuelle de Resend',
        stats: {
          sent: 0,
          delivered: 0,
          bounced: 0,
          complained: 0
        }
      };

    } catch {
      return {
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
      };
    }
  }
}
