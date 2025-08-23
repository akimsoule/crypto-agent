import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useUnsubscribe } from '../hooks/useUnsubscribe';
import { useToast } from '../hooks/useToast';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [step, setStep] = useState<'form' | 'confirmation'>('form');
  
  const {
    unsubscribe,
    isUnsubscribing,
    unsubscribeResult,
    isUnsubscribeSuccess,
    subscriptionInfo,
    isCheckingSubscription,
    checkSubscriptionStatus,
  } = useUnsubscribe();

  const { showToast } = useToast();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      checkSubscriptionStatus(emailParam);
    }
  }, [searchParams, checkSubscriptionStatus]);

  useEffect(() => {
    if (isUnsubscribeSuccess) {
      setStep('confirmation');
      showToast('Désabonnement effectué avec succès', 'success');
    }
  }, [isUnsubscribeSuccess, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      showToast('Veuillez saisir votre adresse email', 'error');
      return;
    }

    if (!email.includes('@')) {
      showToast('Veuillez saisir une adresse email valide', 'error');
      return;
    }

    unsubscribe(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (e.target.value) {
      checkSubscriptionStatus(e.target.value);
    }
  };

  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-base-100 rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-2xl font-bold text-base-content mb-4">
              Désabonnement confirmé
            </h2>
            <p className="text-base-content/70 mb-6">
              {unsubscribeResult?.message || 'Vous avez été désabonné avec succès de notre newsletter.'}
            </p>
            <p className="text-sm text-base-content/60 mb-8">
              Nous sommes désolés de vous voir partir. Si vous changez d'avis, 
              vous pourrez toujours vous réabonner sur notre site.
            </p>
            <Link
              to="/"
              className="w-full bg-primary text-primary-content py-3 px-4 rounded-lg font-medium hover:bg-primary-focus transition-colors inline-block"
            >
              Retour au site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-base-100 rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">
              🚀 Crypto Investors Hub
            </h1>
            <h2 className="text-xl font-semibold text-base-content">
              Se désabonner de la newsletter
            </h2>
          </div>

          {/* Info existante de l'abonnement */}
          {subscriptionInfo && !subscriptionInfo.isActive && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">
                <strong>Information :</strong> L'email {subscriptionInfo.email} n'est pas actuellement abonné à notre newsletter.
              </p>
              <Link
                to="/"
                className="mt-3 w-full bg-neutral text-neutral-content py-2 px-4 rounded-lg font-medium hover:bg-neutral-focus transition-colors inline-block text-center"
              >
                Retour au site
              </Link>
            </div>
          )}

          {/* Avertissement */}
          {(!subscriptionInfo || subscriptionInfo.isActive) && (
            <>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Attention :</strong> Vous êtes sur le point de vous désabonner de notre newsletter exclusive sur les investissements crypto.
                    </p>
                    <p className="text-sm text-yellow-700 mt-2">
                      Vous ne recevrez plus nos analyses, nos alertes sur les pépites crypto et nos rapports d'investisseurs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-base-content mb-2">
                    Adresse email :
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    placeholder="votre@email.com"
                    className="w-full px-4 py-3 border border-base-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    disabled={isUnsubscribing || isCheckingSubscription}
                  />
                  {isCheckingSubscription && (
                    <p className="text-sm text-base-content/60 mt-1">
                      Vérification de l'abonnement...
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isUnsubscribing || isCheckingSubscription || (subscriptionInfo !== null && !subscriptionInfo.isActive)}
                  className="w-full bg-error text-error-content py-3 px-4 rounded-lg font-medium hover:bg-error-focus disabled:bg-neutral-focus disabled:cursor-not-allowed transition-colors"
                >
                  {isUnsubscribing ? 'Désabonnement en cours...' : 'Confirmer le désabonnement'}
                </button>

                <Link
                  to={`/preferences${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  className="w-full bg-neutral text-neutral-content py-3 px-4 rounded-lg font-medium hover:bg-neutral-focus transition-colors inline-block text-center"
                >
                  Modifier mes préférences
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unsubscribe;
