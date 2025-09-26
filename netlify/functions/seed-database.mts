import { Context } from '@netlify/functions';
import { PrismaClient } from '@prisma/client';
import { main as runSeed } from '../../prisma/seed';
import '../trade.app/src/package/common/Util'; // ensure any side-effects/env loading if needed

// Minimal safe logger respecting concise output requirement
const log = (msg: string) => console.log(`[seed-db] ${msg}`);

/*
  Cette fonction reproduit un seed partiel contrôlé depuis le frontend.
  Paramètres query:
   - force=true : force un reseed même si des investisseurs existent déjà
   - reset=true : supprime les données existantes ciblées avant reseed
*/

const prisma = new PrismaClient();

export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === 'true';
  const reset = url.searchParams.get('reset') === 'true';

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Méthode non autorisée' }), { status: 405 });
  }

  try {
    // Vérifie s'il y a déjà des investors
    const existing = await prisma.investorProfile.count();
    if (existing > 0 && !force && !reset) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Investors déjà présents (utilise force=true pour forcer)',
        details: { investorsCreated: 0, configsCreated: 0, timestamp: new Date().toISOString(), force, resetData: reset }
      }), { status: 200 });
    }

    if (reset) {
      log('Reset des données investors');
      // Supprime les entités dépendantes dans un ordre sûr
      await prisma.investorSymbolExecution.deleteMany();
      await prisma.order.deleteMany();
      await prisma.investorProfile.deleteMany();
    }

    // Compte de base avant seed (après éventuel reset)
    const before = await prisma.investorProfile.count();

  // Appelle le seed principal (prisma/seed.ts)
  await runSeed();

    const after = await prisma.investorProfile.count();
    const created = Math.max(0, after - before);

    return new Response(JSON.stringify({
      success: true,
      message: 'Seed exécuté',
      details: { investorsCreated: created, configsCreated: 0, timestamp: new Date().toISOString(), force, resetData: reset }
    }), { status: 200 });
  } catch (error) {
    console.error('[seed-db] erreur', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
