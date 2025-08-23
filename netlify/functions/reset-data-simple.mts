import { Pool } from 'pg';
import type { Context } from "@netlify/functions";

/**
 * Version ultra simplifiée de reset-data
 * Utilise uniquement pg et évite toute autre dépendance
 */
export const handler = async (req: Request, context: Context) => {
  // Vérification simple de la méthode HTTP
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée" }),
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

    // Validation des options
    if (!options.investors && !options.gems && !options.portfolios && !options.all) {
      return new Response(
        JSON.stringify({ 
          error: "Aucune action spécifiée. Utilisez investors=true, gems=true, portfolios=true ou all=true" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stats pour le suivi
    const stats = {
      investments: 0,
      positions: 0,
      snapshots: 0,
      investors: 0,
      gems: 0,
      alerts: 0
    };
    
    // Connexion directe à PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    try {
      // Exécution des requêtes SQL directement
      
      // Suppression des investissements
      if (options.investors || options.all) {
        const result = await pool.query('DELETE FROM "CryptoInvestment"');
        stats.investments = result.rowCount || 0;
        console.log(`✅ ${stats.investments} investissements supprimés`);
      }

      // Suppression des positions et snapshots
      if (options.portfolios || options.all) {
        const posResult = await pool.query('DELETE FROM "CryptoPosition"');
        stats.positions = posResult.rowCount || 0;
        console.log(`✅ ${stats.positions} positions supprimées`);

        const snapResult = await pool.query('DELETE FROM "CryptoPortfolioSnapshot"');
        stats.snapshots = snapResult.rowCount || 0;
        console.log(`✅ ${stats.snapshots} snapshots supprimés`);
      }

      // Suppression des investisseurs
      if (options.investors || options.all) {
        const invResult = await pool.query('DELETE FROM "InvestorProfile"');
        stats.investors = invResult.rowCount || 0;
        console.log(`✅ ${stats.investors} profils d'investisseurs supprimés`);
      }

      // Suppression des gems
      if (options.gems || options.all) {
        const alertResult = await pool.query('DELETE FROM "CryptoGemAlert"');
        stats.alerts = alertResult.rowCount || 0;
        console.log(`✅ ${stats.alerts} alertes supprimées`);

        const gemResult = await pool.query('DELETE FROM "CryptoGemProject"');
        stats.gems = gemResult.rowCount || 0;
        console.log(`✅ ${stats.gems} projets crypto supprimés`);
      }

      // Réinitialisation de l'état
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

      // Retourner une réponse de succès
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
      // Fermer la connexion à la base de données
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
