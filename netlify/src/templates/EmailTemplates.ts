/**
 * Templates d'emails professionnels pour Crypto Investors Hub
 * Utilise Resend pour l'envoi d'emails
 */

export interface EmailTemplateData {
  recipientEmail: string;
  recipientName?: string;
  unsubscribeUrl?: string;
  websiteUrl?: string;
}

export interface NewsletterTemplateData extends EmailTemplateData {
  gems: Array<{
    name: string;
    symbol: string;
    score: number;
    currentPrice: number;
    priceChange24h: number;
    marketCap?: number;
    volume24h?: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    project?: string;
    priority?: string;
  }>;
  weeklyDate: string;
}

export interface WelcomeTemplateData extends EmailTemplateData {
  confirmationUrl?: string;
}

export interface TestEmailTemplateData extends EmailTemplateData {
  testMessage?: string;
  timestamp: string;
}

export class EmailTemplates {
  private static readonly BASE_STYLES = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333333;
        margin: 0;
        padding: 0;
        background-color: #f8fafc;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
      }
      .header p {
        margin: 10px 0 0 0;
        font-size: 16px;
        opacity: 0.9;
      }
      .content {
        padding: 40px 30px;
      }
      .gem-card {
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        transition: all 0.3s ease;
      }
      .gem-card:hover {
        border-color: #667eea;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
      }
      .gem-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      .gem-name {
        font-size: 20px;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
      }
      .gem-symbol {
        background: #667eea;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .gem-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 15px;
      }
      .stat-item {
        text-align: center;
      }
      .stat-label {
        font-size: 12px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 5px;
      }
      .stat-value {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
      }
      .positive {
        color: #10b981;
      }
      .negative {
        color: #ef4444;
      }
      .alert-item {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 16px 20px;
        margin-bottom: 12px;
        border-radius: 0 8px 8px 0;
      }
      .alert-type {
        font-weight: 700;
        color: #92400e;
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.5px;
      }
      .alert-message {
        margin: 8px 0 0 0;
        color: #451a03;
      }
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 8px;
        font-weight: 600;
        text-align: center;
        margin: 20px 0;
        transition: all 0.3s ease;
      }
      .cta-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
      }
      .footer {
        background: #f1f5f9;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e2e8f0;
      }
      .footer p {
        margin: 5px 0;
        font-size: 14px;
        color: #64748b;
      }
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
      .footer a:hover {
        text-decoration: underline;
      }
      .section-title {
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        margin: 30px 0 20px 0;
        padding-bottom: 10px;
        border-bottom: 2px solid #e2e8f0;
      }
      .welcome-message {
        background: #ecfdf5;
        border: 2px solid #10b981;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
      }
      .test-info {
        background: #eff6ff;
        border: 2px solid #3b82f6;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
      }
    </style>
  `;

  /**
   * Template de newsletter hebdomadaire
   */
  static generateNewsletterTemplate(data: NewsletterTemplateData): { html: string; text: string; subject: string } {
    const subject = `🚀 Weekly Crypto Gems Report - ${data.weeklyDate}`;

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.BASE_STYLES}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Weekly Crypto Gems</h1>
            <p>Votre rapport d'investissement crypto hebdomadaire</p>
          </div>
          
          <div class="content">
            <h2 class="section-title">💎 Top Gems de la Semaine</h2>
            ${data.gems.length > 0 
              ? data.gems.map(gem => `
                <div class="gem-card">
                  <div class="gem-header">
                    <h3 class="gem-name">${gem.name}</h3>
                    <span class="gem-symbol">${gem.symbol}</span>
                  </div>
                  <div class="gem-stats">
                    <div class="stat-item">
                      <div class="stat-label">Score Gem</div>
                      <div class="stat-value">${gem.score}/100</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">Prix Actuel</div>
                      <div class="stat-value">$${gem.currentPrice.toLocaleString()}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">Variation 24h</div>
                      <div class="stat-value ${gem.priceChange24h >= 0 ? 'positive' : 'negative'}">
                        ${gem.priceChange24h >= 0 ? '+' : ''}${gem.priceChange24h.toFixed(2)}%
                      </div>
                    </div>
                    ${gem.marketCap ? `
                    <div class="stat-item">
                      <div class="stat-label">Market Cap</div>
                      <div class="stat-value">$${(gem.marketCap / 1000000).toFixed(1)}M</div>
                    </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')
              : '<p>Aucun gem notable cette semaine. Le marché est en observation.</p>'
            }

            ${data.alerts.length > 0 ? `
            <h2 class="section-title">🚨 Alertes Importantes</h2>
            ${data.alerts.map(alert => `
              <div class="alert-item">
                <div class="alert-type">${alert.type}</div>
                <div class="alert-message">${alert.message}</div>
                ${alert.project ? `<div style="margin-top: 8px; font-size: 14px; color: #6b7280;">Projet: ${alert.project}</div>` : ''}
              </div>
            `).join('')}
            ` : ''}

            <div style="text-align: center; margin: 40px 0;">
              <a href="${data.websiteUrl || 'https://crypto-investors-hub.netlify.app'}" class="cta-button">
                📊 Voir le Dashboard Complet
              </a>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">💡 Conseil de la Semaine</h3>
              <p style="margin-bottom: 0;">N'investissez jamais plus que ce que vous pouvez vous permettre de perdre. La diversification reste la clé d'un portefeuille crypto équilibré.</p>
            </div>
          </div>

          <div class="footer">
            <p><strong>Crypto Investors Hub</strong></p>
            <p>Votre intelligence artificielle pour l'investissement crypto</p>
            <p style="margin-top: 20px;">
              ${data.unsubscribeUrl ? `<a href="${data.unsubscribeUrl}">Se désabonner</a> | ` : ''}
              <a href="${data.websiteUrl || 'https://crypto-investors-hub.netlify.app'}">Visiter le site</a>
            </p>
            <p style="font-size: 12px; margin-top: 15px;">
              © ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🚀 WEEKLY CRYPTO GEMS REPORT - ${data.weeklyDate}

💎 TOP GEMS DE LA SEMAINE:
${data.gems.length > 0 
  ? data.gems.map(gem => 
    `• ${gem.name} (${gem.symbol})
  Score: ${gem.score}/100
  Prix: $${gem.currentPrice.toLocaleString()}
  Variation 24h: ${gem.priceChange24h >= 0 ? '+' : ''}${gem.priceChange24h.toFixed(2)}%
  ${gem.marketCap ? `Market Cap: $${(gem.marketCap / 1000000).toFixed(1)}M` : ''}
`).join('\n')
  : 'Aucun gem notable cette semaine. Le marché est en observation.'
}

${data.alerts.length > 0 ? `
🚨 ALERTES IMPORTANTES:
${data.alerts.map(alert => 
  `• ${alert.type}: ${alert.message}${alert.project ? ` (Projet: ${alert.project})` : ''}`
).join('\n')}
` : ''}

💡 CONSEIL DE LA SEMAINE:
N'investissez jamais plus que ce que vous pouvez vous permettre de perdre. 
La diversification reste la clé d'un portefeuille crypto équilibré.

📊 Voir le dashboard complet: ${data.websiteUrl || 'https://crypto-investors-hub.netlify.app'}

---
Crypto Investors Hub - Votre intelligence artificielle pour l'investissement crypto
${data.unsubscribeUrl ? `Pour vous désabonner: ${data.unsubscribeUrl}` : ''}
© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.
    `;

    return { html, text, subject };
  }

  /**
   * Template d'email de bienvenue
   */
  static generateWelcomeTemplate(data: WelcomeTemplateData): { html: string; text: string; subject: string } {
    const subject = "🎉 Bienvenue dans Crypto Investors Hub !";

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.BASE_STYLES}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bienvenue !</h1>
            <p>Merci de rejoindre Crypto Investors Hub</p>
          </div>
          
          <div class="content">
            <div class="welcome-message">
              <h2 style="margin-top: 0; color: #065f46;">✅ Inscription Confirmée</h2>
              <p>Félicitations ${data.recipientName || 'Investisseur'} ! Vous faites maintenant partie de notre communauté d'investisseurs crypto intelligents.</p>
            </div>

            <h2 class="section-title">🚀 Ce que vous allez recevoir</h2>
            
            <div style="display: grid; gap: 20px; margin: 20px 0;">
              <div style="border-left: 4px solid #667eea; padding-left: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #1e293b;">💎 Rapports Hebdomadaires</h3>
                <p style="margin: 0; color: #64748b;">Analyse des meilleures opportunités crypto avec notre IA propriétaire</p>
              </div>
              
              <div style="border-left: 4px solid #10b981; padding-left: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #1e293b;">🚨 Alertes en Temps Réel</h3>
                <p style="margin: 0; color: #64748b;">Notifications instantanées sur les mouvements de marché importants</p>
              </div>
              
              <div style="border-left: 4px solid #f59e0b; padding-left: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #1e293b;">📊 Analyses Détaillées</h3>
                <p style="margin: 0; color: #64748b;">Métriques avancées et scoring propriétaire pour chaque projet</p>
              </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${data.websiteUrl || 'https://crypto-investors-hub.netlify.app'}" class="cta-button">
                🚀 Découvrir le Dashboard
              </a>
            </div>

            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border: 2px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #1e40af;">🔔 Première Newsletter</h3>
              <p style="margin-bottom: 0;">Votre premier rapport hebdomadaire sera envoyé le prochain lundi. En attendant, explorez notre dashboard pour découvrir les gems du moment !</p>
            </div>
          </div>

          <div class="footer">
            <p><strong>Crypto Investors Hub</strong></p>
            <p>L'intelligence artificielle au service de vos investissements crypto</p>
            <p style="margin-top: 20px;">
              ${data.unsubscribeUrl ? `<a href="${data.unsubscribeUrl}">Se désabonner</a> | ` : ''}
              <a href="${data.websiteUrl || 'https://crypto-investors-hub.netlify.app'}">Visiter le site</a>
            </p>
            <p style="font-size: 12px; margin-top: 15px;">
              © ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🎉 BIENVENUE DANS CRYPTO INVESTORS HUB !

✅ INSCRIPTION CONFIRMÉE
Félicitations ${data.recipientName || 'Investisseur'} ! Vous faites maintenant partie de notre communauté d'investisseurs crypto intelligents.

🚀 CE QUE VOUS ALLEZ RECEVOIR:

💎 Rapports Hebdomadaires
Analyse des meilleures opportunités crypto avec notre IA propriétaire

🚨 Alertes en Temps Réel  
Notifications instantanées sur les mouvements de marché importants

📊 Analyses Détaillées
Métriques avancées et scoring propriétaire pour chaque projet

🔔 PREMIÈRE NEWSLETTER
Votre premier rapport hebdomadaire sera envoyé le prochain lundi. En attendant, explorez notre dashboard pour découvrir les gems du moment !

🚀 Découvrir le Dashboard: ${data.websiteUrl || 'https://crypto-investors-hub.netlify.app'}

---
Crypto Investors Hub - L'intelligence artificielle au service de vos investissements crypto
${data.unsubscribeUrl ? `Pour vous désabonner: ${data.unsubscribeUrl}` : ''}
© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.
    `;

    return { html, text, subject };
  }

  /**
   * Template d'email de test
   */
  static generateTestTemplate(data: TestEmailTemplateData): { html: string; text: string; subject: string } {
    const subject = "🧪 Test Email - Crypto Investors Hub";

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.BASE_STYLES}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧪 Test Email</h1>
            <p>Configuration Resend - Test de Fonctionnement</p>
          </div>
          
          <div class="content">
            <div class="test-info">
              <h2 style="margin-top: 0; color: #1e40af;">✅ Configuration Resend Fonctionnelle</h2>
              <p>Cet email confirme que votre configuration Resend fonctionne correctement !</p>
              ${data.testMessage ? `<p><strong>Message de test personnalisé:</strong><br>${data.testMessage}</p>` : ''}
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📋 Détails Techniques</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Service:</strong> Resend API</li>
                <li><strong>Timestamp:</strong> ${data.timestamp}</li>
                <li><strong>Destinataire:</strong> ${data.recipientEmail}</li>
                <li><strong>Template:</strong> Test Template v1.0</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${data.websiteUrl || 'https://crypto-investors-hub.netlify.app'}" class="cta-button">
                🚀 Accéder au Dashboard
              </a>
            </div>

            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border: 2px solid #10b981;">
              <h3 style="margin-top: 0; color: #065f46;">🎯 Prochaines Étapes</h3>
              <p style="margin-bottom: 0;">Maintenant que Resend fonctionne, vous pouvez configurer l'envoi automatique de la newsletter et des alertes crypto !</p>
            </div>
          </div>

          <div class="footer">
            <p><strong>Crypto Investors Hub</strong></p>
            <p>Test Email - Configuration Technique</p>
            <p style="margin-top: 20px;">
              <a href="${data.websiteUrl || 'https://crypto-investors-hub.netlify.app'}">Visiter le site</a>
            </p>
            <p style="font-size: 12px; margin-top: 15px;">
              © ${new Date().getFullYear()} Crypto Investors Hub. Email de test.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🧪 TEST EMAIL - CRYPTO INVESTORS HUB

✅ CONFIGURATION RESEND FONCTIONNELLE
Cet email confirme que votre configuration Resend fonctionne correctement !

${data.testMessage ? `MESSAGE DE TEST PERSONNALISÉ:
${data.testMessage}

` : ''}📋 DÉTAILS TECHNIQUES:
• Service: Resend API
• Timestamp: ${data.timestamp}
• Destinataire: ${data.recipientEmail}
• Template: Test Template v1.0

🎯 PROCHAINES ÉTAPES:
Maintenant que Resend fonctionne, vous pouvez configurer l'envoi automatique de la newsletter et des alertes crypto !

🚀 Accéder au Dashboard: ${data.websiteUrl || 'https://crypto-investors-hub.netlify.app'}

---
Crypto Investors Hub - Test Email - Configuration Technique
© ${new Date().getFullYear()} Crypto Investors Hub. Email de test.
    `;

    return { html, text, subject };
  }
}
