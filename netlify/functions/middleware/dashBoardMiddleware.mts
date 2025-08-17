// Middleware de vérification du token pour Netlify Functions
import type { Context } from "@netlify/functions";
import jwt from 'jsonwebtoken';

// Clé secrète JWT (en production, utiliser une variable d'environnement)
const JWT_SECRET = process.env.JWT_SECRET || 'crypto-agent-secret-key-2025';

export function withDashboardAuth(
  handler: (request: Request, context: Context) => Promise<Response> | Response
) {
  return async (request: Request, context: Context) => {
    // Récupérer le token depuis l'en-tête Authorization: Bearer <token>
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.substring(7);
    // Vérifier le JWT
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return handler(request, context);
  };
}
