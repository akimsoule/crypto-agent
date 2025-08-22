import { CronService } from '../netlify/src/services/CronService';

async function main() {
  try {
    const cronService = new CronService();
    const result = await cronService.executeGemHunter();
    console.log('Résultat:', result);
  } catch (error) {
    console.error('Erreur lors de l’exécution de GemHunter:', error);
  }
}

main();
