import { executeInvestorWatch } from '../netlify/src/services/cron/executeInvestorWatch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testInvestorCooldown() {
  console.log('🚀 Test du système de cooldown des investisseurs...\n');

  try {
    // Vérifier d'abord s'il y a des investisseurs actifs
    const activeInvestors = await prisma.investorProfile.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true }
    });

    console.log(`👥 ${activeInvestors.length} investisseurs actifs trouvés:`);
    activeInvestors.forEach(inv => {
      console.log(`  - ${inv.name} (${inv.type})`);
    });

    if (activeInvestors.length === 0) {
      console.log('⚠️ Aucun investisseur actif. Veuillez d\'abord créer des investisseurs avec npm run setup-investors');
      return;
    }

    // Vérifier s'il y a des gems récents
    const recentGems = await prisma.cryptoGemProject.findMany({
      where: {
        AND: [
          { gemScore: { gte: 40 } },
          {
            lastUpdated: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
            },
          },
        ],
      },
      take: 5,
      select: { symbol: true, name: true, gemScore: true, currentPrice: true }
    });

    console.log(`\n💎 ${recentGems.length} gems récents trouvés:`);
    recentGems.forEach(gem => {
      console.log(`  - ${gem.symbol}: ${gem.name} (Score: ${gem.gemScore}, Prix: $${gem.currentPrice})`);
    });

    if (recentGems.length === 0) {
      console.log('⚠️ Aucun gem récent. Veuillez d\'abord exécuter le gem hunter avec npm run gem-hunter');
      return;
    }

    // Vérifier les transactions récentes
    const recentTransactions = await prisma.cryptoInvestment.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        investorId: true,
        coinId: true,
        symbol: true,
        action: true,
        amount: true,
        timestamp: true,
        reason: true
      }
    });

    console.log(`\n📊 ${recentTransactions.length} transactions récentes (24h):`);
    recentTransactions.forEach(tx => {
      const timeAgo = Math.round((Date.now() - tx.timestamp.getTime()) / (1000 * 60 * 60));
      console.log(`  - ${tx.action} ${tx.symbol}: $${tx.amount.toFixed(2)} il y a ${timeAgo}h - ${tx.reason}`);
    });

    console.log('\n🤖 Exécution du cron investor watch avec système de cooldown...\n');

    // Exécuter le cron et mesurer le temps
    const startTime = Date.now();
    const result = await executeInvestorWatch(prisma);
    const duration = Date.now() - startTime;

    console.log('\n✅ Résultats du test:');
    console.log(`⏱️ Durée d'exécution: ${duration}ms`);
    console.log(`🎯 Succès: ${result.success}`);
    
    if (result.success && result.summary) {
      console.log(`📈 Résumé:`);
      console.log(`  - Gems analysés: ${result.summary.gemsAnalyzed}`);
      console.log(`  - Investisseurs actifs: ${result.summary.activeInvestors}`);
      console.log(`  - Décisions totales: ${result.summary.totalDecisions}`);
      console.log(`  - Ordres d'achat: ${result.summary.buyOrders}`);
      console.log(`  - Ordres de vente: ${result.summary.sellOrders}`);
      console.log(`  - Montant investi: $${(result.summary.totalAmountInvested || 0).toFixed(2)}`);
      console.log(`  - Montant vendu: $${(result.summary.totalAmountSold || 0).toFixed(2)}`);
    }

    if (result.error) {
      console.log(`❌ Erreur: ${result.error}`);
    }

    // Vérifier les nouvelles transactions créées
    const newTransactions = await prisma.cryptoInvestment.findMany({
      where: {
        timestamp: {
          gte: new Date(startTime),
        },
      },
      orderBy: { timestamp: 'desc' },
      select: {
        investorId: true,
        coinId: true,
        symbol: true,
        action: true,
        amount: true,
        reason: true
      }
    });

    console.log(`\n🆕 ${newTransactions.length} nouvelles transactions créées:`);
    newTransactions.forEach(tx => {
      console.log(`  - ${tx.action} ${tx.symbol}: $${tx.amount.toFixed(2)} - ${tx.reason}`);
    });

    // Analyser les raisons de refus pour le cooldown
    console.log('\n🔍 Analyse des décisions de cooldown:');
    if (newTransactions.length === 0) {
      console.log('  Aucune nouvelle transaction = Potentiellement beaucoup de cooldowns activés');
    } else {
      console.log(`  ${newTransactions.length} transactions acceptées malgré le système de cooldown`);
    }

    console.log('\n🎉 Test terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur durant le test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test si ce script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testInvestorCooldown();
}

export { testInvestorCooldown };
