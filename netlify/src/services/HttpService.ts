import { CONFIG } from '../config';

interface HttpHeaders extends Record<string, string> {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Methods': string;
  'Content-Type': string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export class HttpService {
  /**
   * Génère les headers CORS standards
   */
  static getCorsHeaders(): HttpHeaders {
    return {
      'Access-Control-Allow-Origin': CONFIG.CORS.ORIGIN,
      'Access-Control-Allow-Headers': CONFIG.CORS.HEADERS,
      'Access-Control-Allow-Methods': CONFIG.CORS.METHODS,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Génère les headers CORS pour des méthodes spécifiques
   */
  static getCorsHeadersForMethods(methods: string[]): HttpHeaders {
    return {
      'Access-Control-Allow-Origin': CONFIG.CORS.ORIGIN,
      'Access-Control-Allow-Headers': CONFIG.CORS.HEADERS,
      'Access-Control-Allow-Methods': methods.join(', '),
      'Content-Type': 'application/json',
    };
  }

  /**
   * Gère les requêtes OPTIONS (preflight)
   */
  static handleOptions(headers?: Record<string, string>): Response {
    const corsHeaders = headers || this.getCorsHeaders();
    return new Response('', { status: 200, headers: corsHeaders });
  }

  /**
   * Crée une réponse de succès
   */
  static createSuccessResponse<T>(
    data: T,
    message?: string,
    status = 200,
    headers?: Record<string, string>
  ): Response {
    const corsHeaders = headers || this.getCorsHeaders();
    const response: ApiResponse<T> = {
      success: true,
      ...(message && { message }),
      data,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: corsHeaders,
    });
  }

  /**
   * Crée une réponse d'erreur
   */
  static createErrorResponse(
    error: string,
    status = 500,
    headers?: Record<string, string>
  ): Response {
    const corsHeaders = headers || this.getCorsHeaders();
    const response: ApiResponse = {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: corsHeaders,
    });
  }

  /**
   * Crée une réponse d'erreur de validation
   */
  static createValidationErrorResponse(
    message: string,
    headers?: Record<string, string>
  ): Response {
    return this.createErrorResponse(message, 400, headers);
  }

  /**
   * Crée une réponse d'erreur d'autorisation
   */
  static createUnauthorizedResponse(
    message = 'Non autorisé',
    headers?: Record<string, string>
  ): Response {
    return this.createErrorResponse(message, 401, headers);
  }

  /**
   * Crée une réponse d'erreur de méthode non autorisée
   */
  static createMethodNotAllowedResponse(
    allowedMethods: string[],
    headers?: Record<string, string>
  ): Response {
    const corsHeaders = headers || this.getCorsHeadersForMethods(allowedMethods);
    return this.createErrorResponse('Méthode non autorisée', 405, corsHeaders);
  }

  /**
   * Crée une réponse d'erreur de ressource non trouvée
   */
  static createNotFoundResponse(
    message = 'Ressource non trouvée',
    headers?: Record<string, string>
  ): Response {
    return this.createErrorResponse(message, 404, headers);
  }

  /**
   * Parse le body JSON d'une requête avec gestion d'erreur
   */
  static async parseJsonBody<T>(request: Request): Promise<T> {
    try {
      const body = await request.text();
      if (!body) {
        throw new Error('Corps de la requête vide');
      }
      return JSON.parse(body) as T;
    } catch {
      throw new Error('Format JSON invalide');
    }
  }

  /**
   * Extrait les paramètres de query d'une URL
   */
  static getQueryParams(request: Request): URLSearchParams {
    const url = new URL(request.url);
    return url.searchParams;
  }

  /**
   * Valide qu'une méthode HTTP est autorisée
   */
  static validateHttpMethod(
    request: Request,
    allowedMethods: string[]
  ): void {
    if (!allowedMethods.includes(request.method)) {
      throw new Error(`Méthode ${request.method} non autorisée`);
    }
  }

  /**
   * Extrait et valide le token d'autorisation
   */
  static extractAuthToken(request: Request): string {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Header Authorization manquant');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Format du token invalide');
    }

    return authHeader.substring(7); // Retirer "Bearer "
  }

  /**
   * Wrapper générique pour les handlers avec gestion d'erreur
   */
  static async handleWithErrorHandling<T>(
    handler: () => Promise<T>,
    headers?: Record<string, string>
  ): Promise<Response> {
    try {
      const result = await handler();
      if (result instanceof Response) {
        return result;
      }
      return this.createSuccessResponse(result, undefined, 200, headers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
      console.error('Erreur dans le handler:', error);
      return this.createErrorResponse(errorMessage, 500, headers);
    }
  }
}
