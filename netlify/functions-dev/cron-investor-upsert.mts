import { InvestorProfileFactory } from '../../types/investor';
import prisma from '../src/infrastructure/database/prismaClient';

export default async () => {
  try {
    console.log('⏰ Cron upsert des profils investisseurs...');
    const profiles = InvestorProfileFactory.createProfiles();
    let upserted = 0;
    for (const profile of profiles) {
      await prisma.investorProfile.upsert({
        where: { id: profile.id },
        update: profile,
        create: profile,
      });
      upserted++;
    }
    console.log(`✅ ${upserted} profils synchronisés.`);
  } catch (error) {
    console.error('❌ Erreur lors du cron upsert investisseurs:', error);
  } finally {
    await prisma.$disconnect();
  }
};

export const config = {
  schedule: '0 8 * * *', // Tous les jours à 8h
};
