import { useState } from 'react';
import { Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useDataReset } from '../hooks/useDataReset';
import { useToast } from '../hooks/useToast';

interface ResetDataButtonProps {
  className?: string;
  variant?: 'button' | 'card';
}

export default function ResetDataButton({ className = '', variant = 'button' }: ResetDataButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    investors: false,
    gems: false,
    portfolios: false,
    all: false
  });
  
  const { resetData, loading, error, success, stats, clearMessages } = useDataReset();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  // Gérer le changement d'option "all"
  const handleAllOptionChange = (checked: boolean) => {
    if (checked) {
      setResetOptions({
        investors: true,
        gems: true,
        portfolios: true,
        all: true
      });
    } else {
      setResetOptions({
        ...resetOptions,
        all: false
      });
    }
  };

  // Gérer le changement des autres options
  const handleOptionChange = (option: 'investors' | 'gems' | 'portfolios', checked: boolean) => {
    const newOptions = {
      ...resetOptions,
      [option]: checked
    };
    
    // Si toutes les options sont cochées, cocher aussi "all"
    if (newOptions.investors && newOptions.gems && newOptions.portfolios) {
      newOptions.all = true;
    } else {
      newOptions.all = false;
    }
    
    setResetOptions(newOptions);
  };

  const handleReset = async () => {
    const result = await resetData(resetOptions);
    
    if (result?.success) {
      showSuccessToast(`✅ ${result.message}`, { duration: 5000 });
    } else if (error) {
      showErrorToast(`❌ ${error}`, { duration: 8000 });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    clearMessages();
    setResetOptions({ investors: false, gems: false, portfolios: false, all: false });
  };

  const anyOptionSelected = resetOptions.investors || resetOptions.gems || resetOptions.portfolios || resetOptions.all;

  if (variant === 'card') {
    return (
      <>
        <div className={`card bg-base-100 shadow-lg ${className}`}>
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2 mb-4">
              <Trash2 className="w-5 h-5" />
              Réinitialisation des données
            </h3>
            <div className="space-y-3">
              <button 
                className="btn btn-outline btn-error btn-sm w-full justify-start"
                onClick={() => setShowModal(true)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Réinitialiser données
                  </>
                )}
              </button>
              
              {success && (
                <div className="alert alert-success text-xs p-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{success}</span>
                </div>
              )}
              
              {error && (
                <div className="alert alert-error text-xs p-2">
                  <XCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && <ResetModal />}
      </>
    );
  }

  // Mode bouton simple
  return (
    <>
      <button 
        className={`btn btn-error ${className}`}
        onClick={() => setShowModal(true)}
        disabled={loading}
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Réinitialisation...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            Réinitialiser
          </>
        )}
      </button>

      {/* Modal */}
      {showModal && <ResetModal />}
    </>
  );

  function ResetModal() {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Réinitialisation des données
          </h3>
          
          <div className="py-4">
            <p className="text-sm text-base-content/70 mb-4">
              Cette action va supprimer les données sélectionnées de la base de données. Cette opération est irréversible.
            </p>

            <div className="form-control space-y-3">
              <label className="cursor-pointer label">
                <span className="label-text">
                  <div className="flex items-center gap-2 text-error">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Tout réinitialiser</span>
                  </div>
                  <div className="text-xs text-error/70 mt-1">
                    ⚠️ ATTENTION: Supprime TOUTES les données (investisseurs, gems, portfolios)
                  </div>
                </span>
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-error" 
                  checked={resetOptions.all}
                  onChange={(e) => handleAllOptionChange(e.target.checked)}
                />
              </label>

              <div className="divider my-1">OU</div>

              <label className="cursor-pointer label">
                <span className="label-text">
                  <div className="flex items-center gap-2">
                    <span>Investisseurs</span>
                  </div>
                  <div className="text-xs text-base-content/60 mt-1">
                    Profils d'investisseurs et leurs investissements
                  </div>
                </span>
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={resetOptions.investors}
                  onChange={(e) => handleOptionChange('investors', e.target.checked)}
                  disabled={resetOptions.all}
                />
              </label>

              <label className="cursor-pointer label">
                <span className="label-text">
                  <div className="flex items-center gap-2">
                    <span>Gems (Cryptos)</span>
                  </div>
                  <div className="text-xs text-base-content/60 mt-1">
                    Projets crypto et alertes associées
                  </div>
                </span>
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={resetOptions.gems}
                  onChange={(e) => handleOptionChange('gems', e.target.checked)}
                  disabled={resetOptions.all}
                />
              </label>

              <label className="cursor-pointer label">
                <span className="label-text">
                  <div className="flex items-center gap-2">
                    <span>Portfolios</span>
                  </div>
                  <div className="text-xs text-base-content/60 mt-1">
                    Snapshots de portefeuilles et positions
                  </div>
                </span>
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={resetOptions.portfolios}
                  onChange={(e) => handleOptionChange('portfolios', e.target.checked)}
                  disabled={resetOptions.all}
                />
              </label>
            </div>

            {anyOptionSelected && (
              <div className="alert alert-warning mt-4">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <div className="font-bold">Action irréversible!</div>
                  <div className="text-sm">Cette action supprimera définitivement les données sélectionnées.</div>
                </div>
              </div>
            )}

            {success && (
              <div className="alert alert-success mt-4">
                <CheckCircle className="w-5 h-5" />
                <span>{success}</span>
                
                {stats && (
                  <ul className="text-xs mt-2 list-disc list-inside">
                    {stats.investors > 0 && <li>{stats.investors} profils investisseurs supprimés</li>}
                    {stats.investments > 0 && <li>{stats.investments} investissements supprimés</li>}
                    {stats.gems > 0 && <li>{stats.gems} projets crypto supprimés</li>}
                    {stats.alerts > 0 && <li>{stats.alerts} alertes supprimées</li>}
                    {stats.positions > 0 && <li>{stats.positions} positions supprimées</li>}
                    {stats.snapshots > 0 && <li>{stats.snapshots} snapshots supprimés</li>}
                  </ul>
                )}
              </div>
            )}

            {error && (
              <div className="alert alert-error mt-4">
                <XCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-action">
            <button 
              className="btn btn-ghost" 
              onClick={closeModal}
              disabled={loading}
            >
              Annuler
            </button>
            <button 
              className="btn btn-error"
              onClick={handleReset}
              disabled={loading || !anyOptionSelected}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Réinitialiser
                </>
              )}
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={closeModal}></div>
      </div>
    );
  }
}
