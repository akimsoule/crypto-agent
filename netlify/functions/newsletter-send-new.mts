import { Context } from '@netlify/functions'
import { NewsletterService } from '../src/services/NewsletterService.ts';
import { HttpService } from '../src/services/HttpService.ts';

export default async (request: Request, context: Context) => {
  if (request.method === "OPTIONS") {
    return HttpService.handleOptions();
  }

  if (request.method !== "POST") {
    return HttpService.createErrorResponse("Méthode non autorisée", 405);
  }

  const newsletterService = new NewsletterService();

  try {
    // Générer le contenu de la newsletter
    const content = await newsletterService.generateNewsletterContent();
    
    // Envoyer la newsletter
    const result = await newsletterService.sendNewsletter(content);

    if (!result.success) {
      return HttpService.createErrorResponse(result.message, 500);
    }

    return HttpService.createSuccessResponse({
      message: result.message,
      stats: result.data
    });

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la newsletter:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return HttpService.createErrorResponse(errorMessage, 500);
  } finally {
    await newsletterService.disconnect();
  }
};
