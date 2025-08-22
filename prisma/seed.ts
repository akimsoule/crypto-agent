import { PrismaClient } from '@prisma/client';
import { InvestorProfileFactory } from '../types/investor';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Configuration système - Token Facebook
  await seedSystemConfig();

  // 2. Profils d'investisseurs
  await seedInvestorProfiles();

  // 3. État initial du système CryptoGem
  await seedCryptoGemState();

  // 4. Configurations système supplémentaires
  await seedAdditionalConfigs();

  console.log('🎉 Seeding completed successfully!');
}

async function seedSystemConfig() {
  console.log('📋 Seeding system configurations...');

  // Vérifier si le token Facebook existe déjà
  const existingToken = await prisma.cryptoSystemConfig.findUnique({
    where: { configKey: 'facebook_access_token' }
  });

  if (!existingToken) {
    // Insérer le token Facebook seulement s'il n'existe pas
    const facebookToken = 'EAAKxGeDzL3gBPIl6XB5UVcjTZBSeycI1cMKjfnfnSX40w4ZAbmMoRKK4tmLcHPDY2TMI79Oh5KZCMegd5RQedzjZCgKx89PZB7nU8SmS4uaZBcy4ToKKomAZC8ZAOATXYbz5uaIDiOudAIawwHtZBSFdaCQV29Bmfa5zNEmZBt6ZCgZCiBeYBynwzVdIDtuayB22wW4R';
    
    await prisma.cryptoSystemConfig.create({
      data: {
        configKey: 'facebook_access_token',
        configValue: facebookToken,
        description: 'Token d\'accès Facebook pour la publication automatique',
        isActive: true
      }
    });

    console.log('✅ Token Facebook ajouté à la base de données');
  } else {
    console.log('ℹ️ Token Facebook déjà présent dans la base de données');
  }
}

async function seedInvestorProfiles() {
  console.log('👥 Seeding investor profiles...');

  // Créer ou mettre à jour tous les profils de la factory
  const defaultProfiles = InvestorProfileFactory.createProfiles();
  console.log(`📝 Synchronisation de ${defaultProfiles.length} profils d'investisseurs...`);

  let upsertedCount = 0;

  for (const profile of defaultProfiles) {
    try {
      await prisma.investorProfile.upsert({
        where: { id: profile.id },
        update: profile,
        create: profile,
      });
      upsertedCount++;
      console.log(`✅ Profil synchronisé: ${profile.name} (${profile.type})`);
    } catch (error) {
      console.error(`❌ Erreur lors de la synchronisation du profil ${profile.name}:`, error);
    }
  }

  console.log(`🎯 ${upsertedCount}/${defaultProfiles.length} profils d'investisseurs synchronisés`);
}

async function seedCryptoGemState() {
  console.log('⚙️ Seeding crypto gem state...');

  // Vérifier si un état existe déjà
  const existingState = await prisma.cryptoGemState.findFirst();

  if (!existingState) {
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
    console.log('✅ État initial du système CryptoGem créé');
  } else {
    console.log('ℹ️ État du système CryptoGem déjà présent');
  }
}

async function seedAdditionalConfigs() {
  console.log('🔧 Seeding additional configurations...');

  const additionalConfigs = [
    {
      configKey: 'telegram_enabled',
      configValue: 'true',
      description: 'Activer les notifications Telegram',
      isActive: true
    },
    {
      configKey: 'email_notifications_enabled',
      configValue: 'true',
      description: 'Activer les notifications par email',
      isActive: true
    },
    {
      configKey: 'max_daily_investments',
      configValue: '50',
      description: 'Nombre maximum d\'investissements par jour',
      isActive: true
    },
    {
      configKey: 'risk_management_enabled',
      configValue: 'true',
      description: 'Activer la gestion des risques',
      isActive: true
    },
    {
      configKey: 'simulation_mode',
      configValue: 'true',
      description: 'Mode simulation (pas de vrais investissements)',
      isActive: true
    },
    {
      configKey: 'market_analysis_interval',
      configValue: '3600',
      description: 'Intervalle d\'analyse du marché en secondes',
      isActive: true
    },
    {
      configKey: 'newsletter_sender_email',
      configValue: 'noreply@crypto-agent.com',
      description: 'Email d\'expédition de la newsletter',
      isActive: true
    },
    {
      configKey: 'facebook_page_id',
      configValue: '61566156652015',
      description: 'ID de la page Facebook pour les publications',
      isActive: true
    }
  ];

  for (const config of additionalConfigs) {
    const existing = await prisma.cryptoSystemConfig.findUnique({
      where: { configKey: config.configKey }
    });

    if (!existing) {
      await prisma.cryptoSystemConfig.create({ data: config });
      console.log(`✅ Configuration ajoutée: ${config.configKey}`);
    } else {
      console.log(`ℹ️ Configuration déjà présente: ${config.configKey}`);
    }
  }
}

main()
  .then(() => {
    console.log('🎉 Database seeded successfully!');
  })
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    // Ne pas faire échouer le processus si c'est juste un problème de données existantes
    if (e.message && (
      e.message.includes('Unique constraint') || 
      e.message.includes('already exists') ||
      e.message.includes('duplicate key')
    )) {
      console.log('ℹ️ Données déjà présentes, pas de problème');
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
