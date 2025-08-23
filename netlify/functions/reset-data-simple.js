import { Pool } from 'pg';

/**
 * Version ultra simplifiée de reset-data
 * Utilise uniquement pg et évite toute autre dépendance
 */
export const handler = async (req, context) => {
  // Vérification simple de la méthode HTTP
  if (req.method !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée" })
    };
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
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: "Aucune action spécifiée. Utilisez investors=true, gems=true, portfolios=true ou all=true" 
        })
      };
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
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Réinitialisation terminée avec succès',
          details: {
            ...stats,
            ...options,
            timestamp: new Date().toISOString()
          }
        })
      };
    } finally {
      // Fermer la connexion à la base de données
      await pool.end();
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    };
  }
};
