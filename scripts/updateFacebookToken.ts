import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateFacebookToken() {
  console.log('🔧 Mise à jour du token Facebook...');
  
  const newToken = process.argv[2];
  
  if (!newToken) {
    console.log('❌ Usage: npm run update-facebook-token <nouveau_token>');
    console.log('Exemple: npm run update-facebook-token EAAKxGeDzL3g...');
    process.exit(1);
  }

  try {
    const updated = await prisma.cryptoSystemConfig.update({
      where: { configKey: 'facebook_access_token' },
      data: {
        configValue: newToken,
        updatedAt: new Date()
      }
    });

    console.log('✅ Token Facebook mis à jour avec succès!');
    console.log(`   - Nouveau token (masqué): ${newToken.substring(0, 20)}...`);
    console.log(`   - Mis à jour le: ${updated.updatedAt}`);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateFacebookToken();
