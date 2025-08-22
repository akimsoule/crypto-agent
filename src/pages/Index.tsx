import InvestorsList from "../components/InvestorsList.tsx";
import NewsletterSubscription from "../components/NewsletterSubscription.tsx";
import { useInvestors } from "../hooks/useInvestors";
import { useState } from "react";

export default function Index() {
  const { investors, loading, refetch } = useInvestors();
  const [refreshing, setRefreshing] = useState(false);

  // Calcul des stats dynamiques
  const activeCount = investors.length;
  const avgGain =
    investors.length > 0
      ? investors
          .map((inv) => inv.portfolioSnapshots[0]?.totalReturnPercent ?? 0)
          .reduce((a, b) => a + b, 0) / investors.length
      : 0;
  const totalPositions = investors
    .map((inv) => inv.portfolioSnapshots[0]?.activePositions ?? 0)
    .reduce((a, b) => a + b, 0);
  const lastAnalysis = (() => {
    const allInvestments = investors.flatMap((inv) => inv.investments);
    if (allInvestments.length === 0) return "Jamais";
    const last = allInvestments.reduce((a, b) =>
      new Date(a.timestamp) > new Date(b.timestamp) ? a : b
    );
    const diffMs = Date.now() - new Date(last.timestamp).getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return "À l’instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffJ = Math.floor(diffH / 24);
    return `Il y a ${diffJ}j`;
  })();

  // Fonction d'actualisation des données
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-base-200 p-3 sm:p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Hero section avec titre principal */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            🚀 Bienvenue sur Crypto Investors Hub
          </h1>
          <p className="text-lg sm:text-xl text-base-content/70 max-w-3xl mx-auto">
            Suivez nos investisseurs IA et découvrez les meilleures opportunités
            crypto en temps réel
          </p>
        </div>

        {/* Statistiques dynamiques + bouton actualiser */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 flex-1">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary">
                  {activeCount}
                </div>
                <div className="text-xs sm:text-sm text-base-content/70">
                  Investisseurs actifs
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-success">
                  {avgGain >= 0 ? "+" : ""}
                  {avgGain.toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm text-base-content/70">
                  Gains moyens
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold">
                  {totalPositions}
                </div>
                <div className="text-xs sm:text-sm text-base-content/70">
                  Positions actives
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-3 sm:p-4 text-center">
                <div className="text-sm font-bold">{lastAnalysis}</div>
                <div className="text-xs text-base-content/70">
                  Dernière analyse
                </div>
              </div>
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm ml-4"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <span className="loading loading-spinner loading-xs mr-2"></span>
            ) : (
              <span className="mr-2">🔄</span>
            )}
            Actualiser
          </button>
        </div>

        {/* Layout principal */}
        <div className="space-y-6 sm:space-y-8">
          {/* Grid responsive pour contenu principal */}
          <div className="grid grid-cols-1 gap-6 sm:gap-8">
            {/* Liste des investisseurs */}
            <div>
              <InvestorsList />
            </div>
          </div>

          {/* Newsletter en dessous */}
          <div className="max-w-2xl mx-auto">
            <NewsletterSubscription />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-base-300">
          <div className="text-center text-xs sm:text-sm text-base-content/60 space-y-2">
            <p>
              © 2024 Crypto Investors Hub - Investisseurs IA pour les
              cryptomonnaies
            </p>
            <p>
              ⚠️ Avertissement : Les investissements en cryptomonnaies sont
              risqués. Ne jamais investir plus que ce que vous pouvez vous
              permettre de perdre.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
