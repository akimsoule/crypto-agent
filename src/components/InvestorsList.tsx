import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import { useInvestors, type Investor } from '../hooks/useInvestors'
import { useToast } from '../hooks/useToast'

// Fonction utilitaire pour obtenir l'avatar selon le type
const getInvestorAvatar = (type: string): string => {
  const avatars: Record<string, string> = {
    conservative: '🟢',
    balanced: '🔵', 
    aggressive: '🔴',
    momentum: '🟡',
    contrarian: '🟣'
  }
  return avatars[type] || '⚪'
}

// Fonction utilitaire pour formater le dernier trade
const getLastTradeInfo = (investments: Investor['investments']): string => {
  if (investments.length === 0) return 'Aucun trade'
  
  const lastInvestment = investments[0] // Le plus récent (orderBy desc dans l'API)
  const lastDate = new Date(lastInvestment.timestamp)
  const now = new Date()
  const diffMs = now.getTime() - lastDate.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) return `Il y a ${diffDays}j`
  if (diffHours > 0) return `Il y a ${diffHours}h`
  return 'Récent'
}

export default function InvestorsList() {
  const { investors, loading, error, getInvestorDetail } = useInvestors()
  const { error: showError } = useToast()
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null)
  const [loadingInvestorId, setLoadingInvestorId] = useState<string | null>(null)

  const handleViewDetails = async (investorId: string) => {
    try {
      setLoadingInvestorId(investorId)
      const result = await getInvestorDetail(investorId);
      if (result.success && result.data) {
        setSelectedInvestor(result.data);
        // @ts-expect-error - Ouvrir le modal
        document.getElementById('investor_detail_modal')?.showModal();
      } else {
        showError(result.error || 'Erreur lors du chargement des détails')
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error)
      showError('Erreur lors du chargement des détails')
    } finally {
      setLoadingInvestorId(null)
    }
  }

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
            <span className="ml-4">Chargement des investisseurs...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="alert alert-error">
            <span>Erreur: {error}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold">🤖 Nos Investisseurs IA</h2>
        <div className="badge badge-primary badge-lg self-start sm:self-auto">
          {investors.length} Actifs
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {investors.map((investor, index) => {
          const latestSnapshot = investor.portfolioSnapshots[0]
          const totalReturn = latestSnapshot?.totalReturnPercent || 0
          const winRate = latestSnapshot?.winRate || 0
          const activePositions = latestSnapshot?.activePositions || 0
          const lastTrade = getLastTradeInfo(investor.investments)
          const avatar = getInvestorAvatar(investor.type)
          
          return (
            <div key={investor.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-all">
              <div className="card-body p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="text-xl sm:text-2xl flex-shrink-0">{avatar}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base sm:text-lg truncate">{investor.name}</h3>
                      <div className="badge badge-outline badge-sm">{investor.type}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center text-sm text-base-content/70">
                      <span className="mr-1">#{index + 1}</span>
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="stat p-0">
                    <div className="stat-figure text-primary">
                      {totalReturn >= 0 ? (
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                    </div>
                    <div className="stat-title text-xs">Gains</div>
                    <div className={`stat-value text-sm ${
                      totalReturn >= 0 ? 'text-success' : 'text-error'
                    }`}>
                      {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
                    </div>
                  </div>

                  <div className="stat p-0">
                    <div className="stat-figure text-info">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="stat-title text-xs">Taux Réussite</div>
                    <div className="stat-value text-sm text-info">{winRate.toFixed(1)}%</div>
                  </div>

                  <div className="stat p-0">
                    <div className="stat-figure text-warning">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="stat-title text-xs">Positions</div>
                    <div className="stat-value text-sm text-warning">{activePositions}</div>
                  </div>

                  <div className="stat p-0">
                    <div className="stat-figure text-base-content/50">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="stat-title text-xs truncate">Dernier Trade</div>
                    <div className="stat-value text-xs text-base-content/70 truncate">{lastTrade}</div>
                  </div>
                </div>

                <div className="card-actions justify-end mt-4">
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => handleViewDetails(investor.id)}
                    disabled={loadingInvestorId === investor.id}
                  >
                    {loadingInvestorId === investor.id ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Chargement...
                      </>
                    ) : (
                      'Voir Détails'
                    )}
                  </button>
                  <button className="btn btn-primary btn-sm" disabled>
                    Suivre
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center">
        <p className="text-sm text-base-content/60">
          💡 Les performances sont calculées sur les 30 derniers jours
        </p>
      </div>

      {/* Modal de détails de l'investisseur */}
      <dialog id="investor_detail_modal" className="modal">
        <div className="modal-box w-11/12 max-w-4xl">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          
          {selectedInvestor && (
            <>
              {/* Header du modal */}
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl">{getInvestorAvatar(selectedInvestor.type)}</div>
                <div>
                  <h3 className="font-bold text-2xl">{selectedInvestor.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="badge badge-outline">{selectedInvestor.type}</div>
                    <div className="badge badge-primary">
                      ID: {selectedInvestor.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistiques détaillées */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {selectedInvestor.portfolioSnapshots[0] && (
                  <>
                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-figure text-primary">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="stat-title">Performance totale</div>
                      <div className={`stat-value ${
                        selectedInvestor.portfolioSnapshots[0].totalReturnPercent >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        {selectedInvestor.portfolioSnapshots[0].totalReturnPercent >= 0 ? '+' : ''}
                        {selectedInvestor.portfolioSnapshots[0].totalReturnPercent.toFixed(2)}%
                      </div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-figure text-info">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div className="stat-title">Taux de réussite</div>
                      <div className="stat-value text-info">
                        {selectedInvestor.portfolioSnapshots[0].winRate.toFixed(1)}%
                      </div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-figure text-warning">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div className="stat-title">Positions actives</div>
                      <div className="stat-value text-warning">
                        {selectedInvestor.portfolioSnapshots[0].activePositions}
                      </div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-figure text-secondary">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div className="stat-title">Valeur du portefeuille</div>
                      <div className="stat-value text-secondary">
                        ${selectedInvestor.portfolioSnapshots[0].totalValue.toLocaleString()}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Historique des investissements */}
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-4">Derniers Investissements</h4>
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Crypto</th>
                        <th>ID Coin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvestor.investments.slice(0, 5).map((investment, index) => (
                        <tr key={index}>
                          <td className="text-sm">
                            {new Date(investment.timestamp).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td>
                            <div className="font-semibold">{investment.symbol}</div>
                          </td>
                          <td className="font-mono text-sm text-base-content/70">
                            {investment.coinId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedInvestor.investments.length > 5 && (
                  <div className="text-center mt-4">
                    <p className="text-sm text-base-content/60">
                      Affichage de 5 sur {selectedInvestor.investments.length} investissements
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="modal-action">
                <button className="btn btn-primary" disabled>
                  Suivre cet investisseur
                </button>
                <form method="dialog">
                  <button className="btn">Fermer</button>
                </form>
              </div>
            </>
          )}
        </div>
      </dialog>
    </div>
  )
}
