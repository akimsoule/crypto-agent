#!/usr/bin/env tsx

/**
 * Script de test pour les templates d'emails JSX avec Resend
 * Usage: npm run test-resend-templates
 */

import { EmailRenderer } from '../netlify/src/templates/EmailRenderer';
import { NewsletterEmailProps } from '../netlify/src/templates/NewsletterEmail';
import { WelcomeEmailProps } from '../netlify/src/templates/WelcomeEmail';
import { TestEmailProps } from '../netlify/src/templates/TestEmail';

async function testNewsletterTemplate() {
  console.log('🧪 Test du template Newsletter...');
  
  const props: NewsletterEmailProps = {
    recipientEmail: 'test@example.com',
    recipientName: 'Test User',
    gems: [
      {
        name: 'Bitcoin',
        symbol: 'BTC',
        score: 95,
        currentPrice: 45000,
        priceChange24h: 5.2,
        marketCap: 850000000000,
        volume24h: 25000000000
      },
      {
        name: 'Ethereum',
        symbol: 'ETH',
        score: 88,
        currentPrice: 3200,
        priceChange24h: -2.1,
        marketCap: 380000000000
      }
    ],
    alerts: [
      {
        type: 'PUMP',
        message: 'Bitcoin vient de dépasser les 45000$',
        project: 'Bitcoin',
        priority: 'HIGH'
      }
    ],
    weeklyDate: new Date().toLocaleDateString('fr-FR'),
    websiteUrl: 'https://crypto-investors-hub.netlify.app',
    unsubscribeUrl: 'https://crypto-investors-hub.netlify.app/unsubscribe?email=test@example.com'
  };

  try {
    const result = await EmailRenderer.renderNewsletter(props);
    console.log('✅ Newsletter HTML généré:', result.html.length, 'caractères');
    console.log('✅ Newsletter Text généré:', result.text.length, 'caractères');
    console.log('✅ Subject:', result.subject);
  } catch (error) {
    console.error('❌ Erreur Newsletter:', error);
  }
}

async function testWelcomeTemplate() {
  console.log('🧪 Test du template Welcome...');
  
  const props: WelcomeEmailProps = {
    recipientEmail: 'test@example.com',
    recipientName: 'Test User',
    websiteUrl: 'https://crypto-investors-hub.netlify.app',
    unsubscribeUrl: 'https://crypto-investors-hub.netlify.app/unsubscribe?email=test@example.com'
  };

  try {
    const result = await EmailRenderer.renderWelcome(props);
    console.log('✅ Welcome HTML généré:', result.html.length, 'caractères');
    console.log('✅ Welcome Text généré:', result.text.length, 'caractères');
    console.log('✅ Subject:', result.subject);
  } catch (error) {
    console.error('❌ Erreur Welcome:', error);
  }
}

async function testTestTemplate() {
  console.log('🧪 Test du template Test...');
  
  const props: TestEmailProps = {
    recipientEmail: 'test@example.com',
    testMessage: 'Ceci est un message de test personnalisé',
    timestamp: new Date().toLocaleString('fr-FR'),
    websiteUrl: 'https://crypto-investors-hub.netlify.app'
  };

  try {
    const result = await EmailRenderer.renderTest(props);
    console.log('✅ Test HTML généré:', result.html.length, 'caractères');
    console.log('✅ Test Text généré:', result.text.length, 'caractères');
    console.log('✅ Subject:', result.subject);
  } catch (error) {
    console.error('❌ Erreur Test:', error);
  }
}

async function main() {
  console.log('🚀 Test des templates d\'emails JSX avec React-Email\n');
  
  await testNewsletterTemplate();
  console.log('');
  
  await testWelcomeTemplate();
  console.log('');
  
  await testTestTemplate();
  console.log('');
  
  console.log('✅ Tests terminés !');
}

main().catch(console.error);
