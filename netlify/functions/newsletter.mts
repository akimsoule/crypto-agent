import { Context } from '@netlify/functions'
import { withDashboardAuth } from './middleware/dashBoardMiddleware.mts';
import { NewsletterService, HttpService } from '../src/services';

interface SubscriptionRequest {
  email: string;
  source?: string;
  preferences?: Record<string, unknown>;
}

const handler = async (request: Request, context: Context) => {
  const headers = HttpService.getCorsHeadersForMethods(['GET', 'POST', 'DELETE', 'OPTIONS']);

  // Gérer les requêtes OPTIONS (preflight)
  if (request.method === "OPTIONS") {
    return HttpService.handleOptions(headers);
  }

  const newsletterService = new NewsletterService();

  try {
    switch (request.method) {
      case "POST":
        return await handleSubscribe(request, headers, newsletterService);
      case "GET":
        return await handleGetSubscriptions(request, headers, newsletterService);
      case "DELETE":
        return await handleUnsubscribe(request, headers, newsletterService);
      default:
        return HttpService.createMethodNotAllowedResponse(['GET', 'POST', 'DELETE'], headers);
    }
  } catch (error) {
    console.error("Erreur dans newsletter:", error);
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

// Gérer l'abonnement à la newsletter
async function handleSubscribe(
  request: Request,
  headers: Record<string, string>,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const body: SubscriptionRequest = await HttpService.parseJsonBody(request);
    const result = await newsletterService.subscribe(body);

    if (result.success) {
      return HttpService.createSuccessResponse(result.data, result.message, 201, headers);
    } else {
      return HttpService.createValidationErrorResponse(result.message, headers);
    }
  } catch (error) {
    console.error("Erreur lors de l'abonnement:", error);
    return HttpService.createErrorResponse("Erreur lors de l'inscription", 500, headers);
  }
}

// Gérer la récupération des abonnements (admin)
async function handleGetSubscriptions(
  request: Request,
  headers: Record<string, string>,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const searchParams = HttpService.getQueryParams(request);
    
    const params = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
      status: searchParams.get("status") as 'active' | 'inactive' | 'all' | undefined,
      search: searchParams.get("search") || undefined,
    };

    const result = await newsletterService.getSubscriptions(params);

    if (result.success) {
      return HttpService.createSuccessResponse(result.data, undefined, 200, headers);
    } else {
      return HttpService.createErrorResponse(result.error || "Erreur lors de la récupération", 500, headers);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des abonnements:", error);
    return HttpService.createErrorResponse("Erreur lors de la récupération des abonnements", 500, headers);
  }
}

// Gérer le désabonnement
async function handleUnsubscribe(
  request: Request,
  headers: Record<string, string>,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const searchParams = HttpService.getQueryParams(request);
    const email = searchParams.get("email");

    if (!email) {
      return HttpService.createValidationErrorResponse("Email requis pour le désabonnement", headers);
    }

    const result = await newsletterService.unsubscribe(email);

    if (result.success) {
      return HttpService.createSuccessResponse(result.data, result.message, 200, headers);
    } else {
      return HttpService.createValidationErrorResponse(result.message, headers);
    }
  } catch (error) {
    console.error("Erreur lors du désabonnement:", error);
    return HttpService.createErrorResponse("Erreur lors du désabonnement", 500, headers);
  }
}
