import type { Context } from "@netlify/functions";
import { Pool } from 'pg';
import * as jwt from 'jsonwebtoken';

/**
 * Version autonome et allégée de l'endpoint pour réinitialiser les données
 * Inclut directement l'authentification pour réduire les dépendances de fichiers
 */

// Clé secrète JWT
const JWT_SECRET = process.env.JWT_SECRET || 'crypto-agent-secret-key-2025';

// Middleware d'authentification intégré
const withAuth = (handler: (req: Request, context: Context) => Promise<Response>) => {
  return async (req: Request, context: Context) => {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Vérifier le JWT
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    return handler(req, context);
  };
};

// Handler principal
const handler = async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }
  
  try {
    const url = new URL(req.url);
    const options = {
      investors: url.searchParams.get('investors') === 'true',
      gems: url.searchParams.get('gems') === 'true',
      portfolios: url.searchParams.get('portfolios') === 'true', 
      all: url.searchParams.get('all') === 'true'
    };

    if (!options.investors && !options.gems && !options.portfolios && !options.all) {
      return new Response(
        JSON.stringify({ 
          error: "Aucune action spécifiée. Utilisez investors=true, gems=true, portfolios=true ou all=true" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Statistiques des suppressions
    const stats = {
      investments: 0,
      positions: 0,
      snapshots: 0,
      investors: 0,
      gems: 0,
      alerts: 0
    };
    
    // Connexion directe à la base de données
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    try {
      // Utilisation de SQL brut pour éviter de charger Prisma
      
      // Toujours supprimer les investissements en premier (contrainte de clé étrangère)
      if (options.investors || options.all) {
        const { rowCount: investmentsCount } = await pool.query('DELETE FROM "CryptoInvestment"');
        stats.investments = investmentsCount || 0;
        console.log(`✅ ${stats.investments} investissements supprimés`);
      }

      // Supprimer les positions et snapshots
      if (options.portfolios || options.all) {
        const { rowCount: positionsCount } = await pool.query('DELETE FROM "CryptoPosition"');
        stats.positions = positionsCount || 0;
        console.log(`✅ ${stats.positions} positions supprimées`);

        const { rowCount: snapshotsCount } = await pool.query('DELETE FROM "CryptoPortfolioSnapshot"');
        stats.snapshots = snapshotsCount || 0;
        console.log(`✅ ${stats.snapshots} snapshots supprimés`);
      }

      // Supprimer les profils d'investisseurs
      if (options.investors || options.all) {
        const { rowCount: investorsCount } = await pool.query('DELETE FROM "InvestorProfile"');
        stats.investors = investorsCount || 0;
        console.log(`✅ ${stats.investors} profils d'investisseurs supprimés`);
      }

      // Supprimer les gems
      if (options.gems || options.all) {
        const { rowCount: alertsCount } = await pool.query('DELETE FROM "CryptoGemAlert"');
        stats.alerts = alertsCount || 0;
        console.log(`✅ ${stats.alerts} alertes supprimées`);

        const { rowCount: gemsCount } = await pool.query('DELETE FROM "CryptoGemProject"');
        stats.gems = gemsCount || 0;
        console.log(`✅ ${stats.gems} projets crypto supprimés`);
      }

      // Réinitialiser l'état du système si nécessaire
      if (options.all) {
        await pool.query(`
          UPDATE "CryptoGemState" 
          SET "currentPage" = 1, 
              "processPhase" = 'FETCH', 
              "isProcessing" = false, 
              "lastCycleStart" = NOW()
        `);
        console.log("✅ État du système réinitialisé");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Réinitialisation terminée avec succès',
          details: {
            ...stats,
            ...options,
            timestamp: new Date().toISOString()
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } finally {
      // Fermeture de la connexion
      await pool.end();
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Exporter le handler avec middleware d'authentification
export default withAuth(handler);
