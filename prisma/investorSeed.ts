import prisma from "../src/prismaClient";

const investorProfiles = [
  {
    id: "conservative_bob",
    name: "Bob le Conservateur",
    type: "conservative",
    riskTolerance: 0.3,
    maxPositionSize: 15,
    holdingPeriod: 30,
    sellThreshold: 12,
    stopLoss: 8,
    sentimentWeight: 0.2,
    technicalWeight: 0.8,
    description: "Investisseur prudent qui privilégie la préservation du capital",
    initialBalance: 10000,
    isActive: true
  },
  {
    id: "balanced_alice",
    name: "Alice l'Équilibrée",
    type: "balanced",
    riskTolerance: 0.6,
    maxPositionSize: 20,
    holdingPeriod: 21,
    sellThreshold: 25,
    stopLoss: 12,
    sentimentWeight: 0.4,
    technicalWeight: 0.6,
    description: "Investisseuse équilibrée qui combine croissance et stabilité",
    initialBalance: 10000,
    isActive: true
  },
  {
    id: "aggressive_charlie",
    name: "Charlie l'Agressif",
    type: "aggressive",
    riskTolerance: 0.9,
    maxPositionSize: 30,
    holdingPeriod: 14,
    sellThreshold: 50,
    stopLoss: 20,
    sentimentWeight: 0.3,
    technicalWeight: 0.7,
    description: "Investisseur agressif en quête de gains importants",
    initialBalance: 10000,
    isActive: true
  },
  {
    id: "momentum_diana",
    name: "Diana la Momentum",
    type: "momentum",
    riskTolerance: 0.7,
    maxPositionSize: 25,
    holdingPeriod: 7,
    sellThreshold: 30,
    stopLoss: 15,
    sentimentWeight: 0.6,
    technicalWeight: 0.4,
    description: "Investisseuse qui suit les tendances et le momentum",
    initialBalance: 10000,
    isActive: true
  },
  {
    id: "contrarian_erik",
    name: "Erik le Contrarian",
    type: "contrarian",
    riskTolerance: 0.8,
    maxPositionSize: 25,
    holdingPeriod: 45,
    sellThreshold: 40,
    stopLoss: 18,
    sentimentWeight: 0.8,
    technicalWeight: 0.2,
    description: "Investisseur contrarian qui achète quand les autres vendent",
    initialBalance: 10000,
    isActive: true
  }
];

async function main() {
  for (const profile of investorProfiles) {
    await prisma.investorProfile.upsert({
      where: { id: profile.id },
      update: { ...profile, updatedAt: new Date() },
      create: profile
    });
    console.log(`Upserted profile: ${profile.id}`);
  }

  console.log("✅ Seed investisseurs terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
