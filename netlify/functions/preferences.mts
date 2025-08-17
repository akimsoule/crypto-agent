import { Context } from '@netlify/functions'
import { NewsletterService, HttpService } from '../src/services';

interface PreferencesData {
  email: string;
  preferences: {
    frequency?: 'weekly' | 'daily' | 'monthly';
    topics?: string[];
    format?: 'html' | 'text';
  };
}

const handler = async (request: Request, context: Context) => {
  const headers = HttpService.getCorsHeadersForMethods(['GET', 'POST', 'OPTIONS']);

  // Gérer les requêtes OPTIONS (preflight)
  if (request.method === "OPTIONS") {
    return HttpService.handleOptions(headers);
  }

  const newsletterService = new NewsletterService();

  try {
    switch (request.method) {
      case "GET":
        return await handleGetPreferencesPage(request, headers, newsletterService);
      case "POST":
        return await handleUpdatePreferences(request, headers, newsletterService);
      default:
        return HttpService.createMethodNotAllowedResponse(['GET', 'POST'], headers);
    }
  } catch (error) {
    console.error("Erreur dans preferences:", error);
    return HttpService.createErrorResponse(
      error instanceof Error ? error.message : "Erreur interne du serveur",
      500,
      headers
    );
  } finally {
    await newsletterService.disconnect();
  }
};

export default handler;

// Afficher la page de gestion des préférences
async function handleGetPreferencesPage(
  request: Request,
  headers: Record<string, string>,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const searchParams = HttpService.getQueryParams(request);
    const email = searchParams.get("email");

    if (!email) {
      return new Response(generatePreferencesPageHTML(), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'text/html' }
      });
    }

    // Récupérer les préférences actuelles
    const subscription = await newsletterService.getSubscriptionByEmail(email);
    
    if (!subscription) {
      return new Response(generatePreferencesPageHTML(email, null, "Aucun abonnement trouvé pour cet email"), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'text/html' }
      });
    }

    const currentPreferences = subscription.preferences ? 
      JSON.parse(subscription.preferences) : {};
    
    const pageHTML = generatePreferencesPageHTML(email, currentPreferences, undefined, subscription.isActive);
    
    return new Response(pageHTML, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error("Erreur lors de l'affichage des préférences:", error);
    return HttpService.createErrorResponse("Erreur lors du chargement de la page", 500, headers);
  }
}

// Mettre à jour les préférences
async function handleUpdatePreferences(
  request: Request,
  headers: Record<string, string>,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const frequency = formData.get("frequency") as string;
    const format = formData.get("format") as string;
    const topics = formData.getAll("topics") as string[];

    if (!email) {
      return HttpService.createValidationErrorResponse("Email requis", headers);
    }

    // Construire l'objet de préférences
    const preferences = {
      frequency: frequency || 'weekly',
      format: format || 'html',
      topics: topics || []
    };

    const result = await newsletterService.updatePreferences(email, preferences);

    // Retourner une page HTML de confirmation
    const confirmationHTML = generatePreferencesConfirmationHTML(
      result.success, 
      result.message || (result.success ? "Préférences mises à jour avec succès" : "Erreur lors de la mise à jour")
    );
    
    return new Response(confirmationHTML, {
      status: result.success ? 200 : 400,
      headers: { ...headers, 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences:", error);
    const errorHTML = generatePreferencesConfirmationHTML(false, "Erreur lors de la mise à jour des préférences");
    return new Response(errorHTML, {
      status: 500,
      headers: { ...headers, 'Content-Type': 'text/html' }
    });
  }
}

function generatePreferencesPageHTML(
  email?: string, 
  currentPreferences?: any, 
  errorMessage?: string,
  isActive?: boolean
): string {
  const prefs = currentPreferences || {};
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Préférences Newsletter - Crypto Investors Hub</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin-bottom: 10px;
    }
    .form-group {
      margin-bottom: 25px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: #374151;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      box-sizing: border-box;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: #2563eb;
    }
    .checkbox-group {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      padding: 8px;
      background: #f9fafb;
      border-radius: 6px;
    }
    .checkbox-item input[type="checkbox"] {
      width: auto;
      margin-right: 8px;
    }
    .btn {
      background: #2563eb;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      width: 100%;
      margin-top: 10px;
      box-sizing: border-box;
      word-wrap: break-word;
    }
    .btn:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #6b7280;
      text-decoration: none;
      display: inline-block;
      text-align: center;
      margin-top: 10px;
      width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
    }
    .btn-secondary:hover {
      background: #4b5563;
    }
    .btn-danger {
      background: #ef4444;
    }
    .btn-danger:hover {
      background: #dc2626;
    }
    .info-box {
      background: #dbeafe;
      border-left: 4px solid #2563eb;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .error-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      color: #991b1b;
    }
    .inactive-notice {
      background: #fbbf24;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Crypto Investors Hub</h1>
      <h2>Gérer vos préférences newsletter</h2>
    </div>

    ${errorMessage ? `
      <div class="error-box">
        <p><strong>Erreur :</strong> ${errorMessage}</p>
        <a href="${process.env.WEBSITE_URL || 'https://cryptoinvestorshub.com'}" class="btn btn-secondary">
          Retour au site
        </a>
      </div>
    ` : ''}

    ${email && isActive === false ? `
      <div class="inactive-notice">
        <p><strong>⚠️ Attention :</strong> Votre abonnement est actuellement inactif. Vous devez vous réabonner pour recevoir notre newsletter.</p>
        <a href="${process.env.WEBSITE_URL || 'https://cryptoinvestorshub.com'}#newsletter" class="btn">
          Se réabonner
        </a>
      </div>
    ` : ''}

    ${!errorMessage ? `
      <div class="info-box">
        <p><strong>ℹ️ Personnalisez votre expérience</strong></p>
        <p>Configurez vos préférences pour recevoir uniquement le contenu qui vous intéresse le plus.</p>
      </div>

      <form method="POST" action="/api/preferences">
        <div class="form-group">
          <label for="email">Adresse email :</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            value="${email || ''}" 
            required 
            placeholder="votre@email.com"
          >
        </div>

        <div class="form-group">
          <label for="frequency">Fréquence de réception :</label>
          <select id="frequency" name="frequency" required>
            <option value="weekly" ${prefs.frequency === 'weekly' ? 'selected' : ''}>Hebdomadaire (recommandé)</option>
            <option value="daily" ${prefs.frequency === 'daily' ? 'selected' : ''}>Quotidienne</option>
            <option value="monthly" ${prefs.frequency === 'monthly' ? 'selected' : ''}>Mensuelle</option>
          </select>
        </div>

        <div class="form-group">
          <label for="format">Format d'email :</label>
          <select id="format" name="format" required>
            <option value="html" ${prefs.format === 'html' || !prefs.format ? 'selected' : ''}>HTML (avec images et mise en forme)</option>
            <option value="text" ${prefs.format === 'text' ? 'selected' : ''}>Texte simple</option>
          </select>
        </div>

        <div class="form-group">
          <label>Sujets d'intérêt :</label>
          <div class="checkbox-group">
            <div class="checkbox-item">
              <input type="checkbox" id="top-investors" name="topics" value="top-investors" 
                     ${prefs.topics?.includes('top-investors') ? 'checked' : ''}>
              <label for="top-investors">🏆 Top Investisseurs</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="crypto-gems" name="topics" value="crypto-gems"
                     ${prefs.topics?.includes('crypto-gems') ? 'checked' : ''}>
              <label for="crypto-gems">💎 Pépites Crypto</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="trading-signals" name="topics" value="trading-signals"
                     ${prefs.topics?.includes('trading-signals') ? 'checked' : ''}>
              <label for="trading-signals">📊 Signaux Trading</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="market-analysis" name="topics" value="market-analysis"
                     ${prefs.topics?.includes('market-analysis') ? 'checked' : ''}>
              <label for="market-analysis">📈 Analyses Marché</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="defi-projects" name="topics" value="defi-projects"
                     ${prefs.topics?.includes('defi-projects') ? 'checked' : ''}>
              <label for="defi-projects">🏦 Projets DeFi</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="nft-trends" name="topics" value="nft-trends"
                     ${prefs.topics?.includes('nft-trends') ? 'checked' : ''}>
              <label for="nft-trends">🎨 Tendances NFT</label>
            </div>
          </div>
        </div>

        <button type="submit" class="btn">
          Sauvegarder les préférences
        </button>

        <a href="${process.env.WEBSITE_URL}/unsubscribe?email=${encodeURIComponent(email || '')}" class="btn btn-danger">
          Se désabonner
        </a>

        <a href="${process.env.WEBSITE_URL || 'https://cryptoinvestorshub.com'}" class="btn btn-secondary">
          Retour au site
        </a>
      </form>
    ` : ''}
  </div>
</body>
</html>
  `;
}

function generatePreferencesConfirmationHTML(success: boolean, message: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? 'Préférences mises à jour' : 'Erreur'} - Crypto Investors Hub</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    .success {
      color: #059669;
    }
    .error {
      color: #dc2626;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }
    .btn {
      background: #2563eb;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      text-decoration: none;
      display: inline-block;
      margin-top: 20px;
      margin-right: 10px;
      box-sizing: border-box;
      word-wrap: break-word;
      max-width: 100%;
    }
    .btn:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #6b7280;
      box-sizing: border-box;
      word-wrap: break-word;
      max-width: 100%;
    }
    .btn-secondary:hover {
      background: #4b5563;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1 class="${success ? 'success' : 'error'}">
      ${success ? 'Préférences mises à jour !' : 'Erreur'}
    </h1>
    <p>${message}</p>
    ${success ? `
      <p>Vos préférences ont été enregistrées. Vous recevrez notre prochaine newsletter selon vos nouveaux paramètres.</p>
    ` : ''}
    <a href="${process.env.WEBSITE_URL || 'https://cryptoinvestorshub.com'}" class="btn">
      Retour au site
    </a>
    ${success ? `
      <a href="javascript:history.back()" class="btn btn-secondary">
        Modifier à nouveau
      </a>
    ` : ''}
  </div>
</body>
</html>
  `;
}
