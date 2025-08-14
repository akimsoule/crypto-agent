import prisma from "./prismaClient";
import { CryptoGemHunter } from "./cryptoGemHunter";
import { watchMarketAndAct } from "./action";

async function main() {
  const args = process.argv.slice(2);
  const investorArg = args.find(a => a.startsWith("--investor="));
  const runAll = args.includes("--all") || !investorArg;
  const investorId = investorArg ? investorArg.split("=")[1] : undefined;

  const gemHunter = new CryptoGemHunter();

  try {
    console.log("🔎 Recherche des gems...");
    const gems = await gemHunter.findGemsQuick();
    console.log(`✅ ${gems.length} gems récupérées`);

    let targetProfiles: any[] = [];
    if (investorId && !runAll) {
      const profile = await prisma.investorProfile.findUnique({ where: { id: investorId } });
      if (!profile) {
        console.error(`Profil investisseur non trouvé: ${investorId}`);
        process.exit(1);
      }
      targetProfiles = [profile];
    } else {
      targetProfiles = await prisma.investorProfile.findMany({ where: { isActive: true } });
    }

    console.log(`🚀 Exécution de l'action pour ${targetProfiles.length} investisseur(s)`);

    for (const profile of targetProfiles) {
      try {
        console.log(`
---
👤 Traitement: ${profile.name} (${profile.id})`);
        const result = await watchMarketAndAct(profile.id, gems, prisma);
        console.log(`   ✅ Créations: ${result.created}`);
        if (result.investments.length > 0) {
          result.investments.forEach((inv: any, i: number) => {
            console.log(`     ${i + 1}. ${inv.action} ${inv.name} (${inv.symbol}) - ${inv.amount.toFixed ? inv.amount.toFixed(2) : inv.amount}`);
          });
        }
      } catch (err) {
        console.error(`   ❌ Erreur pour ${profile.id}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log("\n✔ Actions terminées");
  } catch (error) {
    console.error("❌ Erreur runAction:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
