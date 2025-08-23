import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useOptimizedDataReset } from '../hooks/useOptimizedDataReset';
import { useToast } from '../hooks/useToast';

type ResetType = 'investors' | 'gems' | 'portfolios' | 'all';

/**
 * Composant optimisé pour réinitialiser les données
 * Utilise des fonctions Netlify spécialisées pour réduire la taille
 */
export const OptimizedResetButtons = () => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetType, setResetType] = useState<ResetType | null>(null);
  const { 
    resetInvestors, 
    resetGems, 
    resetPortfolios, 
    resetAll, 
    loading, 
    success, 
    error, 
    stats, 
    clearMessages 
  } = useOptimizedDataReset();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const handleReset = async () => {
    if (!resetType) return;

    let result;
    switch (resetType) {
      case 'investors':
        result = await resetInvestors();
        break;
      case 'gems':
        result = await resetGems(true); // Réinitialiser aussi l'état
        break;
      case 'portfolios':
        result = await resetPortfolios();
        break;
      case 'all':
        result = await resetAll();
        break;
    }

    setConfirmOpen(false);
    setResetType(null);

    if (result?.success) {
      showSuccessToast(`✅ ${result.message || 'Réinitialisation réussie'}`, { duration: 5000 });
    } else if (error) {
      showErrorToast(`❌ ${error}`, { duration: 8000 });
    }
  };

  const openConfirm = (type: ResetType) => {
    clearMessages();
    setResetType(type);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setResetType(null);
  };

  return (
    <div className="card bg-base-100 shadow-lg flex-1">
      <div className="card-body">
        <h3 className="card-title flex items-center gap-2 mb-4">
          <Trash2 className="w-5 h-5" />
          Réinitialisation des données
        </h3>
        <div className="space-y-3 mb-4">
          <button 
            className="btn btn-outline btn-sm w-full justify-start"
            onClick={() => openConfirm('investors')}
            disabled={loading}
          >
            <span className="text-sm">Réinitialiser les investisseurs</span>
          </button>
          
          <button 
            className="btn btn-outline btn-sm w-full justify-start"
            onClick={() => openConfirm('gems')}
            disabled={loading}
          >
            <span className="text-sm">Réinitialiser les projets crypto</span>
          </button>
          
          <button 
            className="btn btn-outline btn-sm w-full justify-start"
            onClick={() => openConfirm('portfolios')}
            disabled={loading}
          >
            <span className="text-sm">Réinitialiser les portfolios</span>
          </button>
          
          <button 
            className="btn btn-outline btn-error btn-sm w-full justify-start"
            onClick={() => openConfirm('all')}
            disabled={loading}
          >
            <span className="text-sm">Tout réinitialiser</span>
          </button>
        </div>

        {/* Affichage des résultats */}
        {(success || error) && (
          <div className={`alert ${success ? 'alert-success' : 'alert-error'} mt-4`}>
            <div>
              <span>{success || error}</span>
              <button 
                onClick={clearMessages}
                className="btn btn-xs btn-circle btn-ghost ml-auto"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Statistiques */}
        {stats && (
          <div className="mt-4 overflow-x-auto">
            <table className="table table-compact w-full">
              <thead>
                <tr>
                  <th colSpan={2}>Éléments supprimés</th>
                </tr>
              </thead>
              <tbody>
                {stats.investors !== undefined && (
                  <tr>
                    <td>Investisseurs</td>
                    <td className="text-right">{stats.investors}</td>
                  </tr>
                )}
                {stats.investments !== undefined && (
                  <tr>
                    <td>Investissements</td>
                    <td className="text-right">{stats.investments}</td>
                  </tr>
                )}
                {stats.gems !== undefined && (
                  <tr>
                    <td>Projets Crypto</td>
                    <td className="text-right">{stats.gems}</td>
                  </tr>
                )}
                {stats.alerts !== undefined && (
                  <tr>
                    <td>Alertes</td>
                    <td className="text-right">{stats.alerts}</td>
                  </tr>
                )}
                {stats.positions !== undefined && (
                  <tr>
                    <td>Positions</td>
                    <td className="text-right">{stats.positions}</td>
                  </tr>
                )}
                {stats.snapshots !== undefined && (
                  <tr>
                    <td>Snapshots</td>
                    <td className="text-right">{stats.snapshots}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Boîte de dialogue de confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirmation</h3>
            <p>
              {resetType === 'all'
                ? 'Êtes-vous sûr de vouloir réinitialiser TOUTES les données? Cette action est irréversible.'
                : `Êtes-vous sûr de vouloir réinitialiser les ${
                    resetType === 'investors' 
                      ? 'investisseurs' 
                      : resetType === 'gems' 
                        ? 'projets crypto' 
                        : 'portfolios'
                  }? Cette action est irréversible.`}
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={closeConfirm} className="btn btn-ghost">
                Annuler
              </button>
              <button 
                onClick={handleReset} 
                className={`btn ${resetType === 'all' ? 'btn-error' : 'btn-warning'}`}
                disabled={loading}
              >
                {loading ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
