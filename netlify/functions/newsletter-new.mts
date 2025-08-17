import { Context } from '@netlify/functions'
import { NewsletterService } from '../src/services/NewsletterService.ts';
import { HttpService } from '../src/services/HttpService.ts';

export default async (request: Request, context: Context) => {
  // Gérer les requêtes OPTIONS (preflight)
  if (request.method === "OPTIONS") {
    return HttpService.handleOptions();
  }

  const newsletterService = new NewsletterService();

  try {
    switch (request.method) {
      case "POST":
        return await handleSubscribe(request, newsletterService);
      case "GET":
        return await handleGetSubscriptions(request, newsletterService);
      case "DELETE":
        return await handleUnsubscribe(request, newsletterService);
      default:
        return HttpService.createErrorResponse("Méthode non autorisée", 405);
    }
  } catch (error) {
    console.error("❌ Erreur dans newsletter:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return HttpService.createErrorResponse(errorMessage, 500);
  } finally {
    await newsletterService.disconnect();
  }
};

// Gérer l'abonnement à la newsletter
async function handleSubscribe(
  request: Request,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const body = await request.json();

    if (!body.email) {
      return HttpService.createErrorResponse("Email requis", 400);
    }

    const result = await newsletterService.subscribe({
      email: body.email,
      source: body.source || 'website',
      preferences: body.preferences || {}
    });

    if (!result.success) {
      return HttpService.createErrorResponse(result.message, 400);
    }

    return HttpService.createSuccessResponse(result.data, result.message);

  } catch (error) {
    console.error("❌ Erreur lors de l'abonnement:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return HttpService.createErrorResponse(errorMessage, 500);
  }
}

// Récupérer les abonnements
async function handleGetSubscriptions(
  request: Request,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status') as 'active' | 'inactive' | 'all' || 'all';
    const search = url.searchParams.get('search') || undefined;

    const result = await newsletterService.getSubscriptions({
      page,
      limit,
      status,
      search
    });

    if (!result.success) {
      return HttpService.createErrorResponse(result.error || 'Erreur lors de la récupération', 500);
    }

    return HttpService.createSuccessResponse(result.data);

  } catch (error) {
    console.error("❌ Erreur lors de la récupération des abonnements:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return HttpService.createErrorResponse(errorMessage, 500);
  }
}

// Gérer le désabonnement
async function handleUnsubscribe(
  request: Request,
  newsletterService: NewsletterService
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return HttpService.createErrorResponse("Email requis", 400);
    }

    const result = await newsletterService.unsubscribe(email);

    if (!result.success) {
      return HttpService.createErrorResponse(result.message, 404);
    }

    return HttpService.createSuccessResponse(result.data, result.message);

  } catch (error) {
    console.error("❌ Erreur lors du désabonnement:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return HttpService.createErrorResponse(errorMessage, 500);
  }
}
