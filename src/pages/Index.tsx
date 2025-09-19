import InvestorsList from "../components/InvestorsList.tsx";
import NewsletterSubscription from "../components/NewsletterSubscription.tsx";
import { useInvestors } from "../hooks/useInvestors";
import { useEffect, useState } from "react";
import { useLeaderboards } from "../hooks/useLeaderboards";

export default function Index() {
  const { investors, loading, refetch } = useInvestors();
  const [refreshing, setRefreshing] = useState(false);
  const [openTopModal, setOpenTopModal] = useState(false);
  const [sideFilter, setSideFilter] = useState<"" | "long" | "short">(() => {
    try {
      const v = localStorage.getItem("leaders.side") || "";
      if (v === "long" || v === "short" || v === "") return v as any;
      return "";
    } catch { return ""; }
  });
  const [includeInactive, setIncludeInactive] = useState<boolean>(() => {
    try {
      return localStorage.getItem("leaders.includeInactive") === "1";
    } catch { return false; }
  });
  const { data: serverLeaders, loading: leaderLoading, error: leaderError, refetch: refetchLeaders } = useLeaderboards({ enabled: false, limit: 3, side: sideFilter || undefined, includeInactive });

  // Classements fournis par l'API uniquement
  const topCryptosByPnL = serverLeaders?.topCryptosByPnL ?? [];
  const topInvestorsByGainRate = serverLeaders?.topInvestorsByGainRate ?? [];
  const topRegularYieldCryptos = serverLeaders?.topRegularYieldCryptos ?? [];

  // Charger côté serveur à l'ouverture du modal
  useEffect(() => {
    if (!openTopModal) return;
    refetchLeaders();
  }, [openTopModal, refetchLeaders, sideFilter, includeInactive]);

  // Persistance des filtres
  useEffect(() => {
    try { localStorage.setItem("leaders.side", sideFilter); } catch {}
  }, [sideFilter]);
  useEffect(() => {
    try { localStorage.setItem("leaders.includeInactive", includeInactive ? "1" : "0"); } catch {}
  }, [includeInactive]);

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
    , allInvestments[0]);
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

        {/* Statistiques dynamiques */}
        <div className="mb-4 sm:mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary">{activeCount}</div>
                <div className="text-xs sm:text-sm text-base-content/70">Investisseurs actifs</div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-success">{avgGain >= 0 ? "+" : ""}{avgGain.toFixed(1)}%</div>
                <div className="text-xs sm:text-sm text-base-content/70">Gains moyens</div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold">{totalPositions}</div>
                <div className="text-xs sm:text-sm text-base-content/70">Positions actives</div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-3 sm:p-4 text-center">
                <div className="text-sm font-bold">{lastAnalysis}</div>
                <div className="text-xs text-base-content/70">Dernière analyse</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-4">
            <button
              className="btn btn-outline btn-sm"
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
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setOpenTopModal(true)}
              disabled={loading}
              title="Voir les Top 3"
            >
              ⭐ Top 3
            </button>
          </div>
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

      {/* Modal Top 3 */}
      {openTopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            aria-label="Fermer le modal"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpenTopModal(false)}
          />
          <div className="relative bg-base-100 rounded-lg shadow-xl w-full max-w-4xl mx-3">
            <div className="p-4 border-b border-base-300 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-bold">Classements Top 3</h3>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <span>Side</span>
                  <select
                    className="select select-bordered select-sm"
                    value={sideFilter}
                    onChange={(e) => setSideFilter(e.target.value as any)}
                  >
                    <option value="">Tous</option>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </label>
                <label className="label cursor-pointer gap-2 text-sm">
                  <span>Inclure inactifs</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                  />
                </label>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => refetchLeaders()}
                  disabled={leaderLoading}
                  title="Rafraîchir les classements"
                >
                  {leaderLoading ? <span className="loading loading-spinner loading-xs mr-2"></span> : <span className="mr-1">🔄</span>}
                  Rafraîchir
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setOpenTopModal(false)}>✖</button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="font-semibold mb-2">Meilleures cryptos (PnL agrégé)</div>
                  {leaderLoading && <div className="text-xs text-base-content/60">Chargement…</div>}
                  {leaderError && <div className="text-xs text-error">{leaderError}</div>}
                  <ul className="space-y-2 text-sm">
                    {topCryptosByPnL.length === 0 && <li className="text-base-content/60">Aucune donnée</li>}
                    {topCryptosByPnL.map((r, idx) => (
                      <li key={r.symbol} className="flex items-center justify-between">
                        <span>{idx + 1}. {r.symbol}</span>
                        <span className={r.pnl >= 0 ? "text-success" : "text-error"}>{r.pnl >= 0 ? "+" : ""}{r.pnl.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="font-semibold mb-2">Meilleurs investisseurs (gain/jour)</div>
                  {leaderLoading && <div className="text-xs text-base-content/60">Chargement…</div>}
                  {leaderError && <div className="text-xs text-error">{leaderError}</div>}
                  <ul className="space-y-2 text-sm">
                    {topInvestorsByGainRate.length === 0 && <li className="text-base-content/60">Aucune donnée</li>}
                    {topInvestorsByGainRate.map((r, idx) => (
                      <li key={r.id} className="flex items-center justify-between">
                        <span>{idx + 1}. {r.name}</span>
                        <span className={r.rate >= 0 ? "text-success" : "text-error"}>{r.rate >= 0 ? "+" : ""}{r.rate.toFixed(2)}%/j</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="font-semibold mb-2">Cryptos au rendement régulier</div>
                  {leaderLoading && <div className="text-xs text-base-content/60">Chargement…</div>}
                  {leaderError && <div className="text-xs text-error">{leaderError}</div>}
                  <ul className="space-y-2 text-sm">
                    {topRegularYieldCryptos.length === 0 && <li className="text-base-content/60">Aucune donnée</li>}
                    {topRegularYieldCryptos.map((r, idx) => (
                      <li key={r.symbol} className="flex items-center justify-between">
                        <span>{idx + 1}. {r.symbol}</span>
                        <span className="text-primary">score {Number.isFinite(r.score) ? r.score.toFixed(2) : "-"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-base-300 flex justify-end">
              <button className="btn btn-sm" onClick={() => setOpenTopModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
