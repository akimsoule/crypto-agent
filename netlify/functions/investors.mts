import { Context } from '@netlify/functions'
import { InvestorService, HttpService } from '../src/services';

const handler = async (request: Request, context: Context) => {
  const headers = HttpService.getCorsHeadersForMethods(['GET', 'OPTIONS']);

  // Gérer les requêtes OPTIONS (preflight)
  if (request.method === "OPTIONS") {
    return HttpService.handleOptions(headers);
  }

  if (request.method !== "GET") {
    return HttpService.createMethodNotAllowedResponse(['GET'], headers);
  }

  const investorService = new InvestorService();

  try {
    const result = await investorService.getInvestors();

    if (result.success) {
      return HttpService.createSuccessResponse(result.data, undefined, 200, headers);
    } else {
      return HttpService.createErrorResponse(result.error || 'Erreur lors de la récupération', 500, headers);
    }

  } catch (error) {
    console.error('Erreur lors de la récupération des investisseurs:', error);
    return HttpService.createErrorResponse('Erreur interne du serveur', 500, headers);
  } finally {
    await investorService.disconnect();
  }
}

export default handler;
