import { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useDatabaseSeed } from '../hooks/useDatabaseSeed';
import { useToast } from '../hooks/useToast';

interface DatabaseSeedButtonProps {
  className?: string;
  variant?: 'button' | 'card';
}

export default function DatabaseSeedButton({ className = '', variant = 'button' }: DatabaseSeedButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [seedOptions, setSeedOptions] = useState({
    force: false,
    resetData: false
  });
  
  const { seedDatabase, loading, error, success, clearMessages } = useDatabaseSeed();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const handleSeed = async () => {
    const result = await seedDatabase(seedOptions.force, seedOptions.resetData);
    
    if (result?.success) {
      showSuccessToast(`✅ ${result.message}`, { duration: 5000 });
      setShowModal(false);
    } else if (error) {
      showErrorToast(`❌ ${error}`, { duration: 8000 });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    clearMessages();
    setSeedOptions({ force: false, resetData: false });
  };

  if (variant === 'card') {
    return (
      <>
        <div className={`card bg-base-100 shadow-lg ${className}`}>
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2 mb-4">
              <Database className="w-5 h-5" />
              Gestion Base de Données
            </h3>
            <div className="space-y-3">
              <button 
                className="btn btn-outline btn-sm w-full justify-start"
                onClick={() => setShowModal(true)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Initialiser/Réinitialiser
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
        {showModal && <SeedModal />}
      </>
    );
  }

  // Mode bouton simple
  return (
    <>
      <button 
        className={`btn ${className}`}
        onClick={() => setShowModal(true)}
        disabled={loading}
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Seeding...
          </>
        ) : (
          <>
            <Database className="w-4 h-4 mr-2" />
            Seed DB
          </>
        )}
      </button>

      {/* Modal */}
      {showModal && <SeedModal />}
    </>
  );

  function SeedModal() {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Database className="w-5 h-5" />
            Initialisation de la Base de Données
          </h3>
          
          <div className="py-4">
            <p className="text-sm text-base-content/70 mb-4">
              Cette action va initialiser la base de données avec les données par défaut (profils d'investisseurs, configurations système, etc.).
            </p>

            <div className="form-control space-y-3">
              <label className="cursor-pointer label">
                <span className="label-text">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>Force la recréation</span>
                  </div>
                  <div className="text-xs text-base-content/60 mt-1">
                    Remplace les données existantes même si elles sont présentes
                  </div>
                </span>
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={seedOptions.force}
                  onChange={(e) => setSeedOptions(prev => ({ ...prev, force: e.target.checked }))}
                />
              </label>

              <label className="cursor-pointer label">
                <span className="label-text">
                  <div className="flex items-center gap-2 text-error">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reset complet</span>
                  </div>
                  <div className="text-xs text-error/70 mt-1">
                    ⚠️ ATTENTION: Supprime TOUTES les données avant le seed
                  </div>
                </span>
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-error" 
                  checked={seedOptions.resetData}
                  onChange={(e) => setSeedOptions(prev => ({ ...prev, resetData: e.target.checked }))}
                />
              </label>
            </div>

            {seedOptions.resetData && (
              <div className="alert alert-warning mt-4">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <div className="font-bold">Action irréversible!</div>
                  <div className="text-sm">Cette action supprimera tous les investissements, profils et données existantes.</div>
                </div>
              </div>
            )}

            {success && (
              <div className="alert alert-success mt-4">
                <CheckCircle className="w-5 h-5" />
                <span>{success}</span>
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
              className={`btn ${seedOptions.resetData ? 'btn-error' : 'btn-primary'}`}
              onClick={handleSeed}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  {seedOptions.resetData ? 'Reset & Seed' : 'Initialiser'}
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
