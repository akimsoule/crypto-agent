import { Context } from '@netlify/functions'
import { NewsletterService, HttpService } from '../src/services';

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
        return await handleGetUnsubscribePage(request, headers, newsletterService);
      case "POST":
        return await handleUnsubscribeAction(request, headers, newsletterService);
      default:
        return HttpService.createMethodNotAllowedResponse(['GET', 'POST'], headers);
    }
  } catch (error) {
    console.error("Erreur dans unsubscribe:", error);
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

// Afficher la page de désabonnement
async function handleGetUnsubscribePage(
  request: Request,
  headers: Record<string, string>,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const searchParams = HttpService.getQueryParams(request);
    const email = searchParams.get("email");

    if (!email) {
      return new Response(generateUnsubscribePageHTML(), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'text/html' }
      });
    }

    // Vérifier si l'email existe
    const subscription = await newsletterService.getSubscriptionByEmail(email);
    
    const pageHTML = generateUnsubscribePageHTML(email, subscription?.isActive || false);
    
    return new Response(pageHTML, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error("Erreur lors de l'affichage de la page de désabonnement:", error);
    return HttpService.createErrorResponse("Erreur lors du chargement de la page", 500, headers);
  }
}

// Traiter l'action de désabonnement
async function handleUnsubscribeAction(
  request: Request,
  headers: Record<string, string>,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;

    if (!email) {
      return HttpService.createValidationErrorResponse("Email requis pour le désabonnement", headers);
    }

    const result = await newsletterService.unsubscribe(email);

    // Retourner une page HTML de confirmation
    const confirmationHTML = generateUnsubscribeConfirmationHTML(result.success, result.message);
    
    return new Response(confirmationHTML, {
      status: result.success ? 200 : 400,
      headers: { ...headers, 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error("Erreur lors du désabonnement:", error);
    const errorHTML = generateUnsubscribeConfirmationHTML(false, "Erreur lors du désabonnement");
    return new Response(errorHTML, {
      status: 500,
      headers: { ...headers, 'Content-Type': 'text/html' }
    });
  }
}

function generateUnsubscribePageHTML(email?: string, isActive?: boolean): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Se désabonner - Crypto Investors Hub</title>
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
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .form-group input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      box-sizing: border-box;
    }
    .form-group input:focus {
      outline: none;
      border-color: #2563eb;
    }
    .btn {
      background: #ef4444;
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
      background: #dc2626;
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
    .info-box {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Crypto Investors Hub</h1>
      <h2>Se désabonner de la newsletter</h2>
    </div>

    ${email && !isActive ? `
      <div class="info-box">
        <p><strong>Information :</strong> L'email ${email} n'est pas actuellement abonné à notre newsletter.</p>
        <a href="${process.env.WEBSITE_URL || 'https://cryptoinvestorshub.com'}" class="btn btn-secondary">
          Retour au site
        </a>
      </div>
    ` : `
      <div class="warning">
        <p><strong>⚠️ Attention :</strong> Vous êtes sur le point de vous désabonner de notre newsletter exclusive sur les investissements crypto.</p>
        <p>Vous ne recevrez plus nos analyses, nos alertes sur les pépites crypto et nos rapports d'investisseurs.</p>
      </div>

      <form method="POST" action="/api/unsubscribe">
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

        <button type="submit" class="btn">
          Confirmer le désabonnement
        </button>

        <a href="${process.env.WEBSITE_URL}/preferences?email=${encodeURIComponent(email || '')}" class="btn btn-secondary">
          Modifier mes préférences
        </a>
      </form>
    `}
  </div>
</body>
</html>
  `;
}

function generateUnsubscribeConfirmationHTML(success: boolean, message: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? 'Désabonnement confirmé' : 'Erreur'} - Crypto Investors Hub</title>
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
      box-sizing: border-box;
      word-wrap: break-word;
      max-width: 100%;
    }
    .btn:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1 class="${success ? 'success' : 'error'}">
      ${success ? 'Désabonnement confirmé' : 'Erreur'}
    </h1>
    <p>${message}</p>
    ${success ? `
      <p>Nous sommes désolés de vous voir partir. Si vous changez d'avis, vous pourrez toujours vous réabonner sur notre site.</p>
    ` : ''}
    <a href="${process.env.WEBSITE_URL || 'https://cryptoinvestorshub.com'}" class="btn">
      Retour au site
    </a>
  </div>
</body>
</html>
  `;
}
