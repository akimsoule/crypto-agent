import { Context } from '@netlify/functions';
import { withDashboardAuth } from './middleware/dashBoardMiddleware.mts';
import { FacebookService, HttpService } from '../src/services';

interface FacebookPostRequest {
  type?: 'gems' | 'performance' | 'market' | 'custom';
  customMessage?: string;
  gemId?: string;
}

const handler = async (request: Request, context: Context) => {
  const headers = HttpService.getCorsHeadersForMethods(['GET', 'POST', 'OPTIONS']);

  // Gérer les requêtes OPTIONS (preflight)
  if (request.method === "OPTIONS") {
    return HttpService.handleOptions(headers);
  }

  if (request.method !== "POST") {
    return HttpService.createMethodNotAllowedResponse(['POST'], headers);
  }

  try {
    const body: FacebookPostRequest = await HttpService.parseJsonBody(request);
    const facebookService = new FacebookService();
    
    const result = await facebookService.createPost(body);

    if (result.success) {
      return HttpService.createSuccessResponse(
        {
          postId: result.postId,
          timestamp: result.timestamp
        },
        result.message,
        200,
        headers
      );
    } else {
      return HttpService.createValidationErrorResponse(result.message, headers);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error("❌ Erreur lors de la publication Facebook:", errorMessage);

    return HttpService.createErrorResponse(
      "Erreur lors de la publication sur Facebook",
      500,
      headers
    );
  }
};

export default withDashboardAuth(handler);
