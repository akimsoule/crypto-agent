import type { Context } from "@netlify/functions";
import { PrismaClient } from '@prisma/client';
import { InvestorProfileFactory } from '../../types/investor';
import { withDashboardAuth } from "./middleware/dashBoardMiddleware.mts";

const prisma = new PrismaClient();

export const handler = async (req: Request, context: Context) => {
  console.log("🌱 Fonction de seed appelée via API");

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';
    const resetData = url.searchParams.get('reset') === 'true';

    if (resetData) {
      console.log("🗑️ Suppression des données existantes...");
      await prisma.cryptoInvestment.deleteMany();
      await prisma.cryptoPosition.deleteMany();
      await prisma.cryptoPortfolioSnapshot.deleteMany();
      await prisma.investorProfile.deleteMany();
      await prisma.cryptoGemProject.deleteMany();
      await prisma.cryptoGemAlert.deleteMany();
      console.log("✅ Données supprimées");
    }

    // Seed des investisseurs
    const existingInvestors = await prisma.investorProfile.count();
    const profiles = InvestorProfileFactory.createProfiles();
    let investorsCreated = 0;
    
    if (existingInvestors === 0 || force) {
      if (force && existingInvestors > 0) {
        await prisma.investorProfile.deleteMany();
        console.log("🔄 Profils existants supprimés");
      }

      for (const profile of profiles) {
        try {
          await prisma.investorProfile.create({ data: profile });
          investorsCreated++;
        } catch (error) {
          console.error(`❌ Erreur profil ${profile.name}:`, error);
        }
      }

      console.log(`✅ ${investorsCreated}/${profiles.length} profils créés`);
    }

    // État du système
    const existingState = await prisma.cryptoGemState.findFirst();
    if (!existingState || force) {
      if (force && existingState) {
        await prisma.cryptoGemState.deleteMany();
      }
      
      await prisma.cryptoGemState.create({
        data: {
          currentPage: 1,
          maxPages: 20,
          batchSize: 100,
          lastCycleStart: new Date(),
          processPhase: 'FETCH',
          isProcessing: false
        }
      });
      console.log("✅ État système créé");
    }

    // Configurations système
    const configs = [
      {
        configKey: 'telegram_enabled',
        configValue: 'true',
        description: 'Activer les notifications Telegram'
      },
      {
        configKey: 'max_daily_investments',
        configValue: '50',
        description: 'Nombre maximum d\'investissements par jour'
      },
      {
        configKey: 'simulation_mode',
        configValue: 'true',
        description: 'Mode simulation'
      }
    ];

    let configsCreated = 0;
    for (const config of configs) {
      const existing = await prisma.cryptoSystemConfig.findUnique({
        where: { configKey: config.configKey }
      });

      if (!existing || force) {
        if (force && existing) {
          await prisma.cryptoSystemConfig.delete({
            where: { configKey: config.configKey }
          });
        }
        
        await prisma.cryptoSystemConfig.create({
          data: {
            ...config,
            isActive: true
          }
        });
        configsCreated++;
      }
    }

    const result = {
      success: true,
      message: 'Seed terminé avec succès',
      details: {
        investorsCreated,
        configsCreated,
        timestamp: new Date().toISOString(),
        force,
        resetData
      }
    };

    console.log("🎉 Seed API terminé:", result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("❌ Erreur seed API:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } finally {
    await prisma.$disconnect();
  }
};

export default withDashboardAuth(handler); // Pour compatibilité avec les anciens systèmes