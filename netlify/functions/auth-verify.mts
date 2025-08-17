import { AuthService, HttpService } from '../src/services';

const handler = async (request: Request) => {
  const headers = HttpService.getCorsHeadersForMethods(['GET', 'OPTIONS']);

  // Gérer les requêtes OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return HttpService.handleOptions(headers);
  }

  if (request.method !== 'GET') {
    return HttpService.createMethodNotAllowedResponse(['GET'], headers);
  }

  try {
    const authService = new AuthService();
    
    // Récupérer le token depuis l'header Authorization
    const authHeader = request.headers.get('Authorization') ?? undefined;
    const token = authService.extractBearerToken(authHeader);
    
    if (!token) {
      return HttpService.createUnauthorizedResponse(
        'Token manquant ou format incorrect',
        headers
      );
    }

    const result = await authService.verifyToken(token);

    if (result.success && result.valid) {
      return HttpService.createSuccessResponse({
        valid: true,
        user: result.user
      }, 'Token valide', 200, headers);
    } else {
      return HttpService.createUnauthorizedResponse(result.error, headers);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification du token:', error);
    return HttpService.createUnauthorizedResponse(
      'Token invalide ou expiré',
      headers
    );
  }
};

export default handler;
