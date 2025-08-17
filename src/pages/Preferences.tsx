import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const Preferences = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">
              🚀 Crypto Investors Hub
            </h1>
            <h2 className="text-xl font-semibold text-gray-900">
              Préférences de newsletter
            </h2>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-500">ℹ️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <strong>Fonctionnalité en développement</strong>
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  La gestion des préférences détaillées sera bientôt disponible. 
                  En attendant, vous pouvez vous désabonner complètement ou nous contacter.
                </p>
              </div>
            </div>
          </div>

          {email && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <strong>Email :</strong> {email}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            <Link
              to={`/unsubscribe${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors inline-block text-center"
            >
              Se désabonner complètement
            </Link>
            
            <a
              href={`mailto:contact@cryptoinvestorshub.com?subject=Préférences newsletter&body=Bonjour,%0D%0A%0D%0AJe souhaiterais modifier mes préférences pour l'email: ${encodeURIComponent(email)}%0D%0A%0D%0AMerci`}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block text-center"
            >
              Nous contacter
            </a>

            <Link
              to="/"
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors inline-block text-center"
            >
              Retour au site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
