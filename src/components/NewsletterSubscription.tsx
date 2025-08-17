import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNewsletterSubscription } from '../hooks/useNewsletterSubscription';

export default function NewsletterSubscription() {
  const {
    email,
    isLoading,
    isSubscribed,
    error,
    success,
    setEmail,
    subscribe,
    clearMessages,
  } = useNewsletterSubscription();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await subscribe();
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error || success) {
      clearMessages();
    }
  };

  if (isSubscribed && success) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-3 sm:p-4">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-success mb-2">
              Inscription réussie !
            </h3>
            <p className="text-xs sm:text-sm text-base-content/70 mb-4">
              {success}
            </p>
            <div className="alert alert-info alert-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs">
                Vérifiez votre boîte mail pour confirmer votre abonnement
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body p-3 sm:p-4">
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <div className="bg-primary/10 p-3 rounded-full">
              <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </div>
          <h3 className="font-bold text-base sm:text-lg">Newsletter Exclusive</h3>
          <p className="text-xs sm:text-sm text-base-content/70">
            Recevez les meilleures pépites crypto et analyses de nos investisseurs IA
          </p>
        </div>

        {/* Alertes d'erreur ou de succès */}
        {error && (
          <div className="alert alert-error alert-sm mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">{error}</span>
            <button
              onClick={clearMessages}
              className="btn btn-sm btn-ghost btn-circle ml-auto"
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        {success && !isSubscribed && (
          <div className="alert alert-success alert-sm mb-4">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="form-control">
            <input
              type="email"
              placeholder="votre@email.com"
              className={`input input-bordered input-sm w-full ${
                error ? 'input-error' : ''
              } ${success ? 'input-success' : ''}`}
              value={email}
              onChange={handleEmailChange}
              required
              disabled={isLoading}
              maxLength={100}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="btn btn-primary btn-sm w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Inscription...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                S'abonner Gratuitement
              </>
            )}
          </button>

          <div className="text-center space-y-2">
            <p className="text-xs opacity-60">
              Pas de spam • Désabonnement facile • 100% gratuit
            </p>
            
            {/* Avantages */}
            <div className="bg-base-200 rounded-lg p-3 mt-3">
              <p className="text-xs font-semibold mb-2">Ce que vous recevrez :</p>
              <ul className="text-xs space-y-1 text-left">
                <li className="flex items-center">
                  <span className="text-success mr-2">•</span>
                  Analyses exclusives de nos investisseurs IA
                </li>
                <li className="flex items-center">
                  <span className="text-success mr-2">•</span>
                  Pépites crypto avant tout le monde
                </li>
                <li className="flex items-center">
                  <span className="text-success mr-2">•</span>
                  Signaux de trading de qualité
                </li>
                <li className="flex items-center">
                  <span className="text-success mr-2">•</span>
                  Résumé hebdomadaire des performances
                </li>
              </ul>
            </div>

            {/* Statistiques fictives pour crédibilité */}
            <div className="flex justify-center space-x-4 mt-3 pt-3 border-t border-base-300">
              <div className="text-center">
                <div className="text-primary font-bold text-sm">2,847</div>
                <div className="text-xs opacity-60">Abonnés actifs</div>
              </div>
              <div className="text-center">
                <div className="text-success font-bold text-sm">+34%</div>
                <div className="text-xs opacity-60">Perf. moyenne</div>
              </div>
              <div className="text-center">
                <div className="text-warning font-bold text-sm">4.9/5</div>
                <div className="text-xs opacity-60">Note moyenne</div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
