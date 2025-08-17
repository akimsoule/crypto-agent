import { FacebookService } from '../src/utils/Facebook.js';

async function testFacebookToken() {
  console.log('🧪 Test du token Facebook...');
  
  const fbService = new FacebookService();
  
  try {
    await fbService.loadAccessToken();
    console.log('✅ Token chargé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors du chargement du token:', error);
  }
}

testFacebookToken();
