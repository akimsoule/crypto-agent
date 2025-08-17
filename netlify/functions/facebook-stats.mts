import { FacebookService } from '../src/services/FacebookService.ts';
import { HttpService } from '../src/services/HttpService.ts';
import { withDashboardAuth } from './middleware/dashBoardMiddleware.mts';

const handler = async (request: Request, context: any): Promise<Response> => {
  if (request.method !== 'GET') {
    return HttpService.createErrorResponse('Method not allowed', 405);
  }

  const facebookService = new FacebookService();

  try {
    const result = await facebookService.getStats();

    if (!result.success) {
      return HttpService.createErrorResponse(result.error || 'Erreur lors de la récupération des stats', 500);
    }

    return HttpService.createSuccessResponse(result.data);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stats Facebook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return HttpService.createErrorResponse(errorMessage, 500);
  } finally {
    await facebookService.disconnect();
  }
};

export default withDashboardAuth(handler);
