import { HttpService, NewsletterService } from '../src/services';

/**
 * Fonction pour tester l'envoi d'emails avec Resend
 * 
 * GET /api/test-email?email=test@example.com&message=Test%20message
 * POST /api/test-email { "email": "test@example.com", "message": "Test message" }
 */
const handler = async (request: Request) => {
  const headers = HttpService.getCorsHeaders();

  try {
    // Gestion des requêtes OPTIONS (CORS preflight)
    if (request.method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    const newsletterService = new NewsletterService();

    if (request.method === 'GET') {
      // Test simple via GET
      const params = new URLSearchParams(request.url.split('?')[1]);
      const email = params.get('email');
      const message = params.get('message');

      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: "Email requis dans les paramètres de requête"
          })
        };
      }

      console.log(`📧 Test email Resend vers: ${email}`);
      
      const result = await newsletterService.sendTestEmail(email, message || undefined);

      if (result.success) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: result.message,
            timestamp: result.timestamp,
            service: 'Resend',
            recipient: email
          })
        };
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: result.message,
            error: result.error
          })
        };
      }
    }

    if (request.method === 'POST') {
      // Test avancé via POST
      let body;
      try {
        const rawBody = request.body
          ? await (typeof request.body === 'string'
              ? Promise.resolve(request.body)
              : (request.body as ReadableStream).getReader
                ? await new Response(request.body).text()
                : '{}')
          : '{}';
        body = JSON.parse(rawBody);
      } catch {
        return HttpService.createErrorResponse("Format JSON invalide", 400);
      }

      if (!body.email) {
        return HttpService.createErrorResponse("Email requis dans le body", 400);
      }

      const { email, message, type = 'test' } = body;

      console.log(`📧 Test email Resend (${type}) vers: ${email}`);

      let result;

      switch (type) {
        case 'welcome':
          result = await newsletterService.sendWelcomeEmail(email, body.name);
          break;
        case 'test':
        default:
          result = await newsletterService.sendTestEmail(email, message);
          break;
      }

      if (result.success) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: result.message,
            timestamp: result.timestamp || new Date().toISOString(),
            service: 'Resend',
            type,
            recipient: email
          })
        };
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: result.message,
            error: result.error
          })
        };
      }
    }

    return HttpService.createErrorResponse("Méthode non autorisée", 405);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Erreur dans test-email:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Erreur lors du test d'email",
        error: errorMessage
      })
    };
  }
};
