import { Context } from '@netlify/functions'
import { NewsletterService } from '../src/services/NewsletterService.ts';
import { HttpService } from '../src/services/HttpService.ts';
import { withDashboardAuth } from '../functions/middleware/dashBoardMiddleware.mts';

interface TestEmailRequest {
  to_email: string;
  test_message?: string;
}

const handler = async (request: Request, context: Context) => {
  if (request.method === "OPTIONS") {
    return HttpService.handleOptions();
  }

  if (request.method !== "POST") {
    return HttpService.createErrorResponse("Méthode non autorisée - utilisez POST", 405);
  }

  const newsletterService = new NewsletterService();

  try {
    const body: TestEmailRequest = await request.json();

    if (!body.to_email) {
      return HttpService.createErrorResponse("Email destinataire requis", 400);
    }

    const result = await newsletterService.sendTestEmail(body.to_email, body.test_message);

    if (!result.success) {
      const statusCode = result.message.includes('Variables d\'environnement') ? 500 : 400;
      return HttpService.createErrorResponse(result.message, statusCode);
    }

    return HttpService.createSuccessResponse({
      message: result.message,
      timestamp: result.timestamp
    });

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de test:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return HttpService.createErrorResponse(errorMessage, 500);
  } finally {
    await newsletterService.disconnect();
  }
};

export default withDashboardAuth(handler);
