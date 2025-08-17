import { render } from '@react-email/render';
import React from 'react';
import NewsletterEmail, { NewsletterEmailProps } from './NewsletterEmail';
import WelcomeEmail, { WelcomeEmailProps } from './WelcomeEmail';
import TestEmail, { TestEmailProps } from './TestEmail';

export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
}

export class EmailRenderer {
  /**
   * Rend le template de newsletter en HTML et text
   */
  static async renderNewsletter(props: NewsletterEmailProps): Promise<RenderedEmail> {
    try {
      const html = await render(React.createElement(NewsletterEmail, props));
      
      // Génération du texte à partir des props
      const text = this.generateNewsletterText(props);
      
      const subject = `🚀 Weekly Crypto Gems Report - ${props.weeklyDate}`;

      return { html, text, subject };
    } catch (error) {
      console.error('❌ Erreur lors du rendu de la newsletter:', error);
      throw new Error('Erreur lors du rendu de la newsletter');
    }
  }

  /**
   * Rend le template de bienvenue en HTML et text
   */
  static async renderWelcome(props: WelcomeEmailProps): Promise<RenderedEmail> {
    try {
      const html = await render(React.createElement(WelcomeEmail, props));
      
      // Génération du texte à partir des props
      const text = this.generateWelcomeText(props);
      
      const subject = "🎉 Bienvenue dans Crypto Investors Hub !";

      return { html, text, subject };
    } catch (error) {
      console.error('❌ Erreur lors du rendu de l\'email de bienvenue:', error);
      throw new Error('Erreur lors du rendu de l\'email de bienvenue');
    }
  }

  /**
   * Rend le template de test en HTML et text
   */
  static async renderTest(props: TestEmailProps): Promise<RenderedEmail> {
    try {
      const html = await render(React.createElement(TestEmail, props));
      
      // Génération du texte à partir des props
      const text = this.generateTestText(props);
      
      const subject = "🧪 Test Email - Crypto Investors Hub";

      return { html, text, subject };
    } catch (error) {
      console.error('❌ Erreur lors du rendu de l\'email de test:', error);
      throw new Error('Erreur lors du rendu de l\'email de test');
    }
  }

  /**
   * Génère la version texte de la newsletter
   */
  private static generateNewsletterText(props: NewsletterEmailProps): string {
    const { recipientName, gems, alerts, weeklyDate, websiteUrl, unsubscribeUrl } = props;

    return `
🚀 WEEKLY CRYPTO GEMS REPORT - ${weeklyDate}

Bonjour ${recipientName || 'Investisseur'} ! 👋

💎 TOP GEMS DE LA SEMAINE:
${gems.length > 0 
  ? gems.map(gem => 
    `• ${gem.name} (${gem.symbol.toUpperCase()})
  Score: ${gem.score}/100
  Prix: $${gem.currentPrice.toLocaleString()}
  Variation 24h: ${gem.priceChange24h >= 0 ? '+' : ''}${gem.priceChange24h.toFixed(2)}%
  ${gem.marketCap ? `Market Cap: $${(gem.marketCap / 1000000).toFixed(1)}M` : ''}
`).join('\n')
  : 'Aucun gem notable cette semaine. Le marché est en observation.'
}

${alerts.length > 0 ? `
🚨 ALERTES IMPORTANTES:
${alerts.map(alert => 
  `• ${alert.type.toUpperCase()}: ${alert.message}${alert.project ? ` (Projet: ${alert.project})` : ''}`
).join('\n')}
` : ''}

💡 CONSEIL DE LA SEMAINE:
N'investissez jamais plus que ce que vous pouvez vous permettre de perdre. 
La diversification reste la clé d'un portefeuille crypto équilibré.

📊 Voir le dashboard complet: ${websiteUrl}

---
Crypto Investors Hub - Votre intelligence artificielle pour l'investissement crypto
${unsubscribeUrl ? `Pour vous désabonner: ${unsubscribeUrl}` : ''}
© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.
    `;
  }

  /**
   * Génère la version texte de l'email de bienvenue
   */
  private static generateWelcomeText(props: WelcomeEmailProps): string {
    const { recipientName, websiteUrl, unsubscribeUrl } = props;

    return `
🎉 BIENVENUE DANS CRYPTO INVESTORS HUB !

✅ INSCRIPTION CONFIRMÉE
Félicitations ${recipientName || 'Investisseur'} ! Vous faites maintenant partie de notre communauté d'investisseurs crypto intelligents.

🚀 CE QUE VOUS ALLEZ RECEVOIR:

💎 Rapports Hebdomadaires
Analyse des meilleures opportunités crypto avec notre IA propriétaire

🚨 Alertes en Temps Réel  
Notifications instantanées sur les mouvements de marché importants

📊 Analyses Détaillées
Métriques avancées et scoring propriétaire pour chaque projet

🔔 PREMIÈRE NEWSLETTER
Votre premier rapport hebdomadaire sera envoyé le prochain lundi. En attendant, explorez notre dashboard pour découvrir les gems du moment !

💡 CONSEIL D'EXPERT
Bienvenue dans le monde passionnant des cryptomonnaies ! Commencez toujours par vous former et n'investissez que de petites sommes au début.

🚀 Découvrir le Dashboard: ${websiteUrl}

---
Crypto Investors Hub - L'intelligence artificielle au service de vos investissements crypto
${unsubscribeUrl ? `Pour vous désabonner: ${unsubscribeUrl}` : ''}
© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.
    `;
  }

  /**
   * Génère la version texte de l'email de test
   */
  private static generateTestText(props: TestEmailProps): string {
    const { recipientEmail, testMessage, timestamp, websiteUrl } = props;

    return `
🧪 TEST EMAIL - CRYPTO INVESTORS HUB

✅ CONFIGURATION RESEND FONCTIONNELLE
Cet email confirme que votre configuration Resend fonctionne correctement !

${testMessage ? `MESSAGE DE TEST PERSONNALISÉ:
${testMessage}

` : ''}📋 DÉTAILS TECHNIQUES:
• Service: Resend API
• Timestamp: ${timestamp}
• Destinataire: ${recipientEmail}
• Template: React JSX Template v1.0

🎯 PROCHAINES ÉTAPES:
Maintenant que Resend fonctionne avec les templates JSX, vous pouvez configurer l'envoi automatique de la newsletter et des alertes crypto !

✅ Service d'email Resend configuré
✅ Templates JSX React professionnels
✅ Système de newsletter fonctionnel
🔄 Configuration des cron jobs automatiques

⚡ AVANTAGES DE RESEND:
📧 Livraison d'emails fiable et rapide
📊 Analytics et métriques détaillées
🎨 Templates React modernes et responsives
🔒 Sécurité et réputation d'expéditeur optimisées

🚀 Accéder au Dashboard: ${websiteUrl}

---
Crypto Investors Hub - Test Email - Configuration Technique
© ${new Date().getFullYear()} Crypto Investors Hub. Email de test.
    `;
  }
}

export default EmailRenderer;
