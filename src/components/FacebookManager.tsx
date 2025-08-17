import { useState, useEffect } from 'react';
import { Facebook } from 'lucide-react';
import { useFacebookStats, useFacebookPost } from '../hooks/useFacebook';
import { useToast } from '../hooks/useToast';

interface FacebookManagerProps {
  onPostSuccess?: (message: string) => void;
}

interface PostHistoryItem {
  id: number;
  type: string;
  timestamp: Date;
  success: boolean;
  message: string;
  content?: string;
}

export default function FacebookManager({ onPostSuccess }: FacebookManagerProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'stats'>('auto');
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState('');
  const [postHistory, setPostHistory] = useState<PostHistoryItem[]>([]);

  const { stats, refresh } = useFacebookStats();
  const { post } = useFacebookPost();
  const { promise } = useToast();

  // Lorsque l'onglet stats devient actif, rafraîchir les données
  useEffect(() => {
    if (activeTab === 'stats') {
      refresh();
    }
  }, [activeTab, refresh]);

  const handlePost = async (type: string, customMessage?: string) => {
    setIsPosting(true);
    
    const postPromise = post(type, customMessage);
    
    try {
      const result = await promise(postPromise, {
        loading: 'Publication en cours...',
        success: 'Publication réussie !',
        error: (err) => `Erreur : ${err?.message || 'Erreur de connexion'}`
      });
      
      if (result.success) {
        onPostSuccess?.(result.message);
        setPostHistory(prev => [
          { id: Date.now(), type, timestamp: new Date(), success: true, message: result.message, content: customMessage },
          ...prev.slice(0, 4)
        ]);
        refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  const canPost = () => {
    if (!stats) return true;
    const now = Date.now();
    const last = stats.lastPostTime ? new Date(stats.lastPostTime).getTime() : 0;
    const deltaMin = (now - last) / 60000;
    return stats.postsToday < stats.maxPostsPerDay && deltaMin >= stats.minTimeBetweenPosts;
  };

  const nextPostTime = () => {
    if (!stats?.lastPostTime) return null;
    const last = new Date(stats.lastPostTime).getTime();
    return new Date(last + stats.minTimeBetweenPosts * 60000);
  };

  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body p-4 sm:p-6">
        <h2 className="card-title flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Facebook className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" /> 
            <span className="text-base sm:text-lg">Gestionnaire Facebook</span>
          </div>
          {stats?.lastPostTime && (
            <div className="badge badge-success badge-sm text-xs sm:text-sm">
              <span className="hidden sm:inline">Dernier post : </span>
              <span className="sm:hidden">Dernier : </span>
              {new Date(stats.lastPostTime).toLocaleString('fr-FR', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          )}
        </h2>

        {/* Onglets */}
        <div className="tabs tabs-boxed mb-4 w-full">
          <a className={`tab flex-1 text-xs sm:text-sm ${activeTab === 'auto' ? 'tab-active' : ''}`} onClick={() => setActiveTab('auto')}>Auto</a>
          <a className={`tab flex-1 text-xs sm:text-sm ${activeTab === 'manual' ? 'tab-active' : ''}`} onClick={() => setActiveTab('manual')}>Manuel</a>
          <a className={`tab flex-1 text-xs sm:text-sm ${activeTab === 'stats' ? 'tab-active' : ''}`} onClick={() => setActiveTab('stats')}>Stats</a>
        </div>

        {/* Contenu */}
        {activeTab === 'auto' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <button 
                className="btn btn-primary btn-sm sm:btn-md text-xs sm:text-sm" 
                onClick={() => handlePost('gems')} 
                disabled={isPosting || !canPost()}
              >
                <span className="hidden sm:inline">Pépites Crypto</span>
                <span className="sm:hidden">Pépites</span>
              </button>
              <button 
                className="btn btn-secondary btn-sm sm:btn-md text-xs sm:text-sm" 
                onClick={() => handlePost('performance')} 
                disabled={isPosting || !canPost()}
              >
                Performance
              </button>
              <button 
                className="btn btn-accent btn-sm sm:btn-md text-xs sm:text-sm" 
                onClick={() => handlePost('market')} 
                disabled={isPosting || !canPost()}
              >
                <span className="hidden sm:inline">Analyse Marché</span>
                <span className="sm:hidden">Marché</span>
              </button>
            </div>
            {!canPost() && nextPostTime() && (
              <div className="alert alert-warning py-2">
                <span className="text-xs sm:text-sm">
                  Prochain post possible : {nextPostTime()?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="space-y-3 sm:space-y-4">
            <textarea 
              className="textarea textarea-bordered w-full h-20 sm:h-24 text-sm" 
              placeholder="Message personnalisé..." 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
            />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-xs text-base-content/70">
                {message.length}/280 caractères
              </div>
              <button 
                className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto" 
                onClick={() => handlePost('custom', message)} 
                disabled={isPosting || !message.trim() || !canPost()}
              >
                {isPosting ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-3 sm:space-y-4">
            {stats ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="stat bg-base-200 rounded-lg p-2 sm:p-3">
                    <div className="stat-title text-xs">Posts/jour</div>
                    <div className="stat-value text-sm sm:text-lg">{stats.postsToday}/{stats.maxPostsPerDay}</div>
                  </div>
                  <div className="stat bg-base-200 rounded-lg p-2 sm:p-3">
                    <div className="stat-title text-xs">Intervalle</div>
                    <div className="stat-value text-sm sm:text-lg">{stats.minTimeBetweenPosts}min</div>
                  </div>
                  <div className="stat bg-base-200 rounded-lg p-2 sm:p-3 col-span-2 sm:col-span-1">
                    <div className="stat-title text-xs">Statut</div>
                    <div className={`stat-value text-sm sm:text-lg ${canPost() ? 'text-success' : 'text-warning'}`}>
                      {canPost() ? '✅ Prêt' : '⏳ Attente'}
                    </div>
                  </div>
                </div>
                {nextPostTime() && (
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-base-300 rounded-lg">
                    <div className="text-xs text-base-content/70 mb-1">Prochaine publication possible :</div>
                    <div className="text-sm font-medium">{nextPostTime()?.toLocaleTimeString('fr-FR')}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center py-4">
                <span className="loading loading-spinner loading-md"></span>
                <span className="ml-2 text-sm">Chargement des stats...</span>
              </div>
            )}
          </div>
        )}

        {/* Historique */}
        {postHistory.length > 0 && (
          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3">Historique des publications</h3>
            <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
              {postHistory.map(item => (
                <div key={item.id} className="text-xs sm:text-sm p-2 sm:p-3 bg-base-200 rounded flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="font-medium capitalize">{item.type}</span>
                  <span className="text-base-content/70">
                    {item.timestamp.toLocaleString('fr-FR', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
