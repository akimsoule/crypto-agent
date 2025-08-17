import { AuthService, HttpService } from '../src/services';

interface LoginRequest {
  username: string;
  password: string;
}

const handler = async (request: Request) => {
  const headers = HttpService.getCorsHeadersForMethods(['POST', 'OPTIONS']);

  // Gérer les requêtes OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return HttpService.handleOptions(headers);
  }

  if (request.method !== 'POST') {
    return HttpService.createMethodNotAllowedResponse(['POST'], headers);
  }

  try {
    const bodyText = await request.text();
    const body: LoginRequest = JSON.parse(bodyText || '{}');
    
    const authService = new AuthService();
    const result = await authService.login(body);

    if (result.success) {
      return HttpService.createSuccessResponse({
        token: result.token,
        user: result.user,
        expiresIn: result.expiresIn
      }, 'Connexion réussie', 200, headers);
    } else {
      return HttpService.createUnauthorizedResponse(result.error, headers);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la connexion:', error);
    return HttpService.createErrorResponse('Erreur serveur lors de la connexion', 500, headers);
  }
};

export default handler;
