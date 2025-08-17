import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export interface NewsletterContent {
  subject: string;
  html: string;
  text: string;
}

async function generateNewsletterContent(): Promise<NewsletterContent> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [topInvestors, topGems, recentTrades] = await Promise.all([
      prisma.cryptoPortfolioSnapshot.findMany({
        where: { timestamp: { gte: sevenDaysAgo } },
        include: { investor: true },
        orderBy: { totalReturnPercent: "desc" },
        take: 3,
      }),
      prisma.cryptoGemProject.findMany({
        where: { priceChangePercentage24h: { gt: 10 } },
        orderBy: { priceChangePercentage24h: "desc" },
        take: 5,
      }),
      prisma.cryptoInvestment.findMany({
        where: { timestamp: { gte: sevenDaysAgo }, action: { in: ["BUY", "SELL"] } },
        include: { investor: true, gemProject: true },
        orderBy: { timestamp: "desc" },
        take: 5,
      }),
    ]);

    const subject = `🚀 CryptoAgent Dashboard - Rapport Privé ${new Date().toLocaleDateString("fr-FR")}`;
    const html = generateHTMLContent(topInvestors, topGems, recentTrades);
    const text = generateTextContent(topInvestors, topGems, recentTrades);

    return { subject, html, text };
  } catch (error) {
    console.error("Erreur lors de la génération du contenu:", error);
    throw new Error("Erreur lors de la génération du contenu de la newsletter");
  }
}

function generateHTMLContent(
  topInvestors: any[],
  topGems: any[],
  recentTrades: any[]
): string {
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Newsletter Crypto Investors Hub</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; }
    .section { background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 25px; }
    .section h3 { color: #2563eb; margin-top: 0; }
    .investor-item, .gem-item, .trade-item { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #2563eb; }
    .positive { color: #22c55e; font-weight: bold; }
    .negative { color: #ef4444; font-weight: bold; }
    .footer { border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #888; font-size: 12px; }
    .unsubscribe { color: #666; font-size: 12px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Crypto Investors Hub</h1>
    <p>Newsletter du ${currentDate}</p>
  </div>

  <div class="section">
    <h3>🏆 Top Investisseurs de la Semaine</h3>
    ${topInvestors
      .map(
        (investor) => `
      <div class="investor-item">
        <strong>${investor.investor.name}</strong> (${investor.investor.type})
        <br>
        Performance: <span class="${investor.totalReturnPercent >= 0 ? "positive" : "negative"}">
          ${investor.totalReturnPercent >= 0 ? "+" : ""}${investor.totalReturnPercent.toFixed(2)}%
        </span>
        <br>
        Taux de réussite: ${investor.winRate.toFixed(1)}% | Positions actives: ${investor.activePositions}
      </div>
    `
      )
      .join("")}
  </div>

  <div class="section">
    <h3>💎 Pépites Crypto du Moment</h3>
    ${topGems
      .map(
        (gem) => `
      <div class="gem-item">
        <strong>${gem.name} (${gem.symbol.toUpperCase()})</strong>
        <br>
        Prix: $${gem.currentPrice.toFixed(gem.currentPrice < 1 ? 6 : 2)}
        <br>
        Performance 24h: <span class="positive">+${gem.priceChangePercentage24h.toFixed(2)}%</span>
        <br>
        Market Cap: $${(gem.marketCap / 1000000).toFixed(2)}M
        ${gem.gemScore ? `<br>Score Gem: ${gem.gemScore.toFixed(1)}/100` : ""}
      </div>
    `
      )
      .join("")}
  </div>

  <div class="section">
    <h3>📊 Trades Récents</h3>
    ${recentTrades
      .map(
        (trade) => `
      <div class="trade-item">
        <strong>${trade.investor.name}</strong> - ${trade.action} ${trade.symbol.toUpperCase()}
        <br>
        Montant: $${trade.amount.toLocaleString()}
        <br>
        Prix: $${trade.price.toFixed(trade.price < 1 ? 6 : 2)}
        <br>
        Raison: ${trade.reason}
        <br>
        <small>Le ${new Date(trade.timestamp).toLocaleDateString("fr-FR")}</small>
      </div>
    `
      )
      .join("")}
  </div>

  <div class="section">
    <h3>📈 Conseils de la Semaine</h3>
    <ul>
      <li><strong>Diversification :</strong> Ne mettez pas tous vos œufs dans le même panier crypto</li>
      <li><strong>DCA (Dollar Cost Averaging) :</strong> Investissez régulièrement plutôt que tout d'un coup</li>
      <li><strong>HODL :</strong> Gardez vos positions long-terme malgré la volatilité</li>
      <li><strong>Recherche :</strong> Toujours faire ses propres recherches (DYOR)</li>
    </ul>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.</p>
    <p>
      <a href="{{unsubscribe_url}}" class="unsubscribe">Se désabonner</a> |
      <a href="{{preferences_url}}" class="unsubscribe">Gérer les préférences</a>
    </p>
    <p style="font-size: 10px; color: #999; margin-top: 20px;">
      ⚠️ Avertissement : Les investissements en cryptomonnaies sont risqués. 
      Ne jamais investir plus que ce que vous pouvez vous permettre de perdre.
    </p>
  </div>
</body>
</html>
  `;
}

function generateTextContent(
  topInvestors: any[],
  topGems: any[],
  recentTrades: any[]
): string {
  const currentDate = new Date().toLocaleDateString("fr-FR");

  return `
🚀 CRYPTO INVESTORS HUB - Newsletter du ${currentDate}

🏆 TOP INVESTISSEURS DE LA SEMAINE
${topInvestors
  .map(
    (investor, index) =>
      `${index + 1}. ${investor.investor.name} (${investor.investor.type})
   Performance: ${investor.totalReturnPercent >= 0 ? "+" : ""}${investor.totalReturnPercent.toFixed(2)}%
   Taux de réussite: ${investor.winRate.toFixed(1)}% | Positions actives: ${investor.activePositions}`
  )
  .join("\n\n")}

💎 PÉPITES CRYPTO DU MOMENT
${topGems
  .map(
    (gem, index) =>
      `${index + 1}. ${gem.name} (${gem.symbol.toUpperCase()})
   Prix: $${gem.currentPrice.toFixed(gem.currentPrice < 1 ? 6 : 2)}
   Performance 24h: +${gem.priceChangePercentage24h.toFixed(2)}%
   Market Cap: $${(gem.marketCap / 1000000).toFixed(2)}M`
  )
  .join("\n\n")}

📊 TRADES RÉCENTS
${recentTrades
  .map(
    (trade, index) =>
      `${index + 1}. ${trade.investor.name} - ${trade.action} ${trade.symbol.toUpperCase()}
   Montant: $${trade.amount.toLocaleString()}
   Prix: $${trade.price.toFixed(trade.price < 1 ? 6 : 2)}
   Raison: ${trade.reason}`
  )
  .join("\n\n")}

📈 CONSEILS DE LA SEMAINE
• Diversification : Ne mettez pas tous vos œufs dans le même panier crypto
• DCA (Dollar Cost Averaging) : Investissez régulièrement plutôt que tout d'un coup  
• HODL : Gardez vos positions long-terme malgré la volatilité
• Recherche : Toujours faire ses propres recherches (DYOR)

⚠️ Avertissement : Les investissements en cryptomonnaies sont risqués. 
Ne jamais investir plus que ce que vous pouvez vous permettre de perdre.

© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.

Pour vous désabonner, répondez à cet email avec "UNSUBSCRIBE" en objet.
  `;
}

async function sendNewsletterToSubscribers(
  subscribers: Array<{ email: string; preferences: string | null }>,
  content: NewsletterContent
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const batchSize = 50;
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (subscriber) => {
        try {
          await sendEmailToSubscriber(subscriber.email, content);
          await prisma.newsletterSubscription.update({
            where: { email: subscriber.email },
            data: { lastEmailSent: new Date(), emailsSent: { increment: 1 } },
          });
          sent++;
        } catch (error) {
          console.error(`Erreur envoi email à ${subscriber.email}:`, error);
          failed++;
        }
      })
    );

    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { sent, failed };
}

async function sendEmailToSubscriber(
  email: string,
  content: NewsletterContent
): Promise<void> {
  try {
    const currentDate = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric", 
      month: "long",
      day: "numeric",
    });

    const emailJSData = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: email,
        from_name: 'Crypto Investors Hub',
        subject: content.subject,
        message_html: await generateEmailContentWithLinks(email), // Contenu avec liens dynamiques
        current_date: currentDate,
        current_year: new Date().getFullYear().toString(),
        reply_to: process.env.REPLY_TO_EMAIL || 'noreply@cryptoinvestorshub.com',
        // URLs pour les liens
        dashboard_url: process.env.DASHBOARD_URL || 'https://cryptoinvestorshub.com/dashboard',
        website_url: process.env.WEBSITE_URL || 'https://cryptoinvestorshub.com',
        unsubscribe_url: `${process.env.WEBSITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}`,
        preferences_url: `${process.env.WEBSITE_URL}/api/preferences?email=${encodeURIComponent(email)}`
      }
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailJSData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur EmailJS: ${response.status} - ${errorText}`);
    }

    console.log(`✅ Email envoyé avec succès à: ${email}`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi à ${email}:`, error);
    throw error;
  }
}

// Nouvelle fonction pour générer le contenu structuré avec les liens dynamiques
async function generateEmailContentWithLinks(email: string): Promise<string> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [topInvestors, topGems, recentTrades] = await Promise.all([
    prisma.cryptoPortfolioSnapshot.findMany({
      where: { timestamp: { gte: sevenDaysAgo } },
      include: { investor: true },
      orderBy: { totalReturnPercent: "desc" },
      take: 3,
    }),
    prisma.cryptoGemProject.findMany({
      where: { priceChangePercentage24h: { gt: 10 } },
      orderBy: { priceChangePercentage24h: "desc" },
      take: 5,
    }),
    prisma.cryptoInvestment.findMany({
      where: { timestamp: { gte: sevenDaysAgo }, action: { in: ["BUY", "SELL"] } },
      include: { investor: true, gemProject: true },
      orderBy: { timestamp: "desc" },
      take: 5,
    }),
  ]);

  const currentDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const unsubscribeUrl = `${process.env.WEBSITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}`;
  const preferencesUrl = `${process.env.WEBSITE_URL}/api/preferences?email=${encodeURIComponent(email)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Newsletter Crypto Investors Hub</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; }
    .section { background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 25px; }
    .section h3 { color: #2563eb; margin-top: 0; }
    .item { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #2563eb; }
    .positive { color: #22c55e; font-weight: bold; }
    .negative { color: #ef4444; font-weight: bold; }
    .footer { border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #888; font-size: 12px; }
    .unsubscribe { color: #666; font-size: 12px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Crypto Investors Hub</h1>
    <p>Newsletter du ${currentDate}</p>
  </div>

  <div class="section">
    <h3>🏆 Top Investisseurs de la Semaine</h3>
    ${topInvestors
      .map(
        (investor) => `
      <div class="item">
        <strong>${investor.investor.name}</strong> (${investor.investor.type})
        <br>
        Performance: <span class="${investor.totalReturnPercent >= 0 ? "positive" : "negative"}">
          ${investor.totalReturnPercent >= 0 ? "+" : ""}${investor.totalReturnPercent.toFixed(2)}%
        </span>
        <br>
        Taux de réussite: ${investor.winRate.toFixed(1)}% | Positions actives: ${investor.activePositions}
      </div>
    `
      )
      .join("")}
  </div>

  <div class="section">
    <h3>💎 Pépites Crypto du Moment</h3>
    ${topGems
      .map(
        (gem) => `
      <div class="item">
        <strong>${gem.name} (${gem.symbol.toUpperCase()})</strong>
        <br>
        Prix: $${gem.currentPrice.toFixed(gem.currentPrice < 1 ? 6 : 2)}
        <br>
        Performance 24h: <span class="positive">+${gem.priceChangePercentage24h.toFixed(2)}%</span>
        <br>
        Market Cap: $${(gem.marketCap / 1000000).toFixed(2)}M
        ${gem.gemScore ? `<br>Score Gem: ${gem.gemScore.toFixed(1)}/100` : ""}
      </div>
    `
      )
      .join("")}
  </div>

  <div class="section">
    <h3>📊 Trades Récents</h3>
    ${recentTrades
      .map(
        (trade) => `
      <div class="item">
        <strong>${trade.investor.name}</strong> - ${trade.action} ${trade.symbol.toUpperCase()}
        <br>
        Montant: $${trade.amount.toLocaleString()}
        <br>
        Prix: $${trade.price.toFixed(trade.price < 1 ? 6 : 2)}
        <br>
        Raison: ${trade.reason}
        <br>
        <small>Le ${new Date(trade.timestamp).toLocaleDateString("fr-FR")}</small>
      </div>
    `
      )
      .join("")}
  </div>

  <div class="section">
    <h3>📈 Conseils de la Semaine</h3>
    <ul>
      <li><strong>Diversification :</strong> Ne mettez pas tous vos œufs dans le même panier crypto</li>
      <li><strong>DCA (Dollar Cost Averaging) :</strong> Investissez régulièrement plutôt que tout d'un coup</li>
      <li><strong>HODL :</strong> Gardez vos positions long-terme malgré la volatilité</li>
      <li><strong>Recherche :</strong> Toujours faire ses propres recherches (DYOR)</li>
    </ul>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Crypto Investors Hub. Tous droits réservés.</p>
    <p>
      <a href="${unsubscribeUrl}" class="unsubscribe">Se désabonner</a> |
      <a href="${preferencesUrl}" class="unsubscribe">Gérer les préférences</a>
    </p>
    <p style="font-size: 10px; color: #999; margin-top: 20px;">
      ⚠️ Avertissement : Les investissements en cryptomonnaies sont risqués. 
      Ne jamais investir plus que ce que vous pouvez vous permettre de perdre.
    </p>
  </div>
</body>
</html>
  `;
}

// Fonction originale conservée pour la rétrocompatibilité
async function generateEmailContent(): Promise<string> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [topInvestors, topGems, recentTrades] = await Promise.all([
    prisma.cryptoPortfolioSnapshot.findMany({
      where: { timestamp: { gte: sevenDaysAgo } },
      include: { investor: true },
      orderBy: { totalReturnPercent: "desc" },
      take: 3,
    }),
    prisma.cryptoGemProject.findMany({
      where: { priceChangePercentage24h: { gt: 10 } },
      orderBy: { priceChangePercentage24h: "desc" },
      take: 5,
    }),
    prisma.cryptoInvestment.findMany({
      where: { timestamp: { gte: sevenDaysAgo }, action: { in: ["BUY", "SELL"] } },
      include: { investor: true, gemProject: true },
      orderBy: { timestamp: "desc" },
      take: 5,
    }),
  ]);

  return `
    <div class="section">
      <h3>🏆 Top Investisseurs de la Semaine</h3>
      ${topInvestors
        .map(
          (investor) => `
        <div class="item">
          <strong>${investor.investor.name}</strong> (${investor.investor.type})
          <br>
          Performance: <span class="${investor.totalReturnPercent >= 0 ? "positive" : "negative"}">
            ${investor.totalReturnPercent >= 0 ? "+" : ""}${investor.totalReturnPercent.toFixed(2)}%
          </span>
          <br>
          Taux de réussite: ${investor.winRate.toFixed(1)}% | Positions actives: ${investor.activePositions}
        </div>
      `
        )
        .join("")}
    </div>

    <div class="section">
      <h3>💎 Pépites Crypto du Moment</h3>
      ${topGems
        .map(
          (gem) => `
        <div class="item">
          <strong>${gem.name} (${gem.symbol.toUpperCase()})</strong>
          <br>
          Prix: $${gem.currentPrice.toFixed(gem.currentPrice < 1 ? 6 : 2)}
          <br>
          Performance 24h: <span class="positive">+${gem.priceChangePercentage24h.toFixed(2)}%</span>
          <br>
          Market Cap: $${(gem.marketCap / 1000000).toFixed(2)}M
          ${gem.gemScore ? `<br>Score Gem: ${gem.gemScore.toFixed(1)}/100` : ""}
        </div>
      `
        )
        .join("")}
    </div>

    <div class="section">
      <h3>📊 Trades Récents</h3>
      ${recentTrades
        .map(
          (trade) => `
        <div class="item">
          <strong>${trade.investor.name}</strong> - ${trade.action} ${trade.symbol.toUpperCase()}
          <br>
          Montant: $${trade.amount.toLocaleString()}
          <br>
          Prix: $${trade.price.toFixed(trade.price < 1 ? 6 : 2)}
          <br>
          Raison: ${trade.reason}
          <br>
          <small>Le ${new Date(trade.timestamp).toLocaleDateString("fr-FR")}</small>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

export async function sendNewsletterProcess(): Promise<{ sent: number; failed: number }> {
  try {
    const subscribers = await prisma.newsletterSubscription.findMany({
      where: { isActive: true, bounced: false },
      select: { email: true, preferences: true },
    });

    if (subscribers.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const content = await generateNewsletterContent();
    const results = await sendNewsletterToSubscribers(subscribers, content);
    return results;
  } finally {
    await prisma.$disconnect();
  }
}
