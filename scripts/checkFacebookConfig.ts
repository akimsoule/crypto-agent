import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFacebookConfig() {
  console.log('🔍 Vérification de la configuration Facebook...');
  
  try {
    const tokenConfig = await prisma.cryptoSystemConfig.findUnique({
      where: { configKey: 'facebook_access_token' }
    });

    if (tokenConfig) {
      console.log('✅ Token Facebook trouvé:');
      console.log(`   - ID: ${tokenConfig.id}`);
      console.log(`   - Description: ${tokenConfig.description}`);
      console.log(`   - Actif: ${tokenConfig.isActive}`);
      console.log(`   - Créé le: ${tokenConfig.createdAt}`);
      console.log(`   - Mis à jour le: ${tokenConfig.updatedAt}`);
      console.log(`   - Token (masqué): ${tokenConfig.configValue.substring(0, 20)}...`);
    } else {
      console.log('❌ Aucun token Facebook trouvé dans la base');
    }

    // Vérifier toutes les configs système
    const allConfigs = await prisma.cryptoSystemConfig.findMany();
    console.log(`\n📊 Total de ${allConfigs.length} configurations système:`);
    allConfigs.forEach(config => {
      console.log(`   - ${config.configKey}: ${config.isActive ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFacebookConfig();
