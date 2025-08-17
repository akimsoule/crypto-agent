// Service de notification par email
// Peut être configuré avec différents providers (SendGrid, Mailgun, AWS SES, etc.)

interface EmailConfig {
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  baseUrl?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = {
      ...config,
      fromEmail: config.fromEmail || process.env.FROM_EMAIL || 'noreply@crypto-investors-hub.com',
      fromName: config.fromName || process.env.FROM_NAME || 'Crypto Investors Hub',
    };
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Pour l'instant, on simule l'envoi d'email
      // Dans un vrai projet, vous intégreriez votre service d'email préféré
      console.log('📧 Simulation envoi email:', {
        to: options.to,
        subject: options.subject,
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
      });

      // Simulation d'un délai d'envoi
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Exemple d'intégration SendGrid (décommentez si vous l'utilisez)
      /*
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: Array.isArray(options.to) 
                ? options.to.map(email => ({ email }))
                : [{ email: options.to }]
            }
          ],
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName,
          },
          reply_to: options.replyTo ? {
            email: options.replyTo
          } : undefined,
          subject: options.subject,
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
            ...(options.text ? [{
              type: 'text/plain',
              value: options.text,
            }] : []),
          ],
          categories: options.tags || ['newsletter'],
        }),
      });

      if (response.ok) {
        return {
          success: true,
          messageId: response.headers.get('x-message-id') || 'unknown',
        };
      } else {
        const errorData = await response.text();
        return {
          success: false,
          error: `SendGrid error: ${response.status} - ${errorData}`,
        };
      }
      */

    } catch (error) {
      console.error('Erreur lors de l\'envoi d\'email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  async sendBulkEmail(
    emails: { to: string; personalizations?: Record<string, string | number> }[], 
    templateOptions: Omit<EmailOptions, 'to'>
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Traitement par batch pour éviter de surcharger le service
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (emailData) => {
          try {
            const result = await this.sendEmail({
              ...templateOptions,
              to: emailData.to,
              // Ici, vous pourriez personnaliser le contenu avec emailData.personalizations
            });

            if (result.success) {
              sent++;
            } else {
              failed++;
              errors.push(`${emailData.to}: ${result.error}`);
            }
          } catch (error) {
            failed++;
            errors.push(`${emailData.to}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
          }
        })
      );

      // Pause entre les batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { sent, failed, errors };
  }
}

// Templates d'emails prédéfinis
export const EmailTemplates = {
  welcome: () => ({
    subject: '🚀 Bienvenue dans Crypto Investors Hub !',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Bienvenue</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px;">
          <h1 style="margin: 0;">🚀 Crypto Investors Hub</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Bienvenue dans notre communauté !</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
          <p style="margin-top: 0;"><strong>Félicitations !</strong></p>
          <p>Vous faites maintenant partie de notre communauté exclusive d'investisseurs crypto. Voici ce qui vous attend :</p>
          <ul style="color: #555; padding-left: 20px;">
            <li>📈 Analyses exclusives de nos investisseurs IA</li>
            <li>💎 Les meilleures pépites crypto avant tout le monde</li>
            <li>📊 Signaux de trading de qualité</li>
            <li>🎯 Résumés hebdomadaires des performances</li>
            <li>🔥 Alertes sur les opportunités exceptionnelles</li>
          </ul>
        </div>

        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
          <h3 style="margin-top: 0; color: #1976d2;">📚 Pour commencer</h3>
          <p>Consultez notre plateforme pour découvrir les performances de nos investisseurs IA et commencer à suivre les plus performants.</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="#" style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Découvrir la Plateforme</a>
          </div>
        </div>

        <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #888; font-size: 14px;">
          <p>Vous recevrez notre newsletter chaque lundi avec les meilleures opportunités de la semaine.</p>
          <p style="font-size: 12px; margin-top: 15px;">
            <a href="#" style="color: #666;">Se désabonner</a> | 
            <a href="#" style="color: #666;">Gérer les préférences</a>
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <p style="font-size: 10px; color: #999;">
            ⚠️ Les investissements en cryptomonnaies sont risqués. Ne jamais investir plus que ce que vous pouvez vous permettre de perdre.
          </p>
          <p style="font-size: 10px; color: #999;">
            © ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
🚀 CRYPTO INVESTORS HUB - Bienvenue !

Félicitations ! Vous faites maintenant partie de notre communauté exclusive d'investisseurs crypto.

Voici ce qui vous attend :
• Analyses exclusives de nos investisseurs IA
• Les meilleures pépites crypto avant tout le monde  
• Signaux de trading de qualité
• Résumés hebdomadaires des performances
• Alertes sur les opportunités exceptionnelles

Vous recevrez notre newsletter chaque lundi avec les meilleures opportunités de la semaine.

⚠️ Les investissements en cryptomonnaies sont risqués. Ne jamais investir plus que ce que vous pouvez vous permettre de perdre.

© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.

Pour vous désabonner, répondez à cet email avec "UNSUBSCRIBE" en objet.
    `,
  }),

  unsubscribeConfirmation: (email: string) => ({
    subject: '👋 Désabonnement confirmé',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2>👋 Désabonnement confirmé</h2>
          <p>Vous ne recevrez plus nos newsletters à l'adresse <strong>${email}</strong>.</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
          <p>Nous espérons que nos contenus vous ont été utiles.</p>
          <p>Si vous changez d'avis, vous pouvez vous réabonner à tout moment sur notre site.</p>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
          <p>© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.</p>
        </div>
      </body>
      </html>
    `,
    text: `
👋 DÉSABONNEMENT CONFIRMÉ

Vous ne recevrez plus nos newsletters à l'adresse ${email}.

Nous espérons que nos contenus vous ont été utiles. Si vous changez d'avis, vous pouvez vous réabonner à tout moment sur notre site.

© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.
    `,
  }),
};

// Instance par défaut du service d'email
export const emailService = new EmailService({
  apiKey: process.env.EMAIL_API_KEY,
  fromEmail: process.env.FROM_EMAIL || 'noreply@crypto-investors-hub.com',
  fromName: process.env.FROM_NAME || 'Crypto Investors Hub',
});
