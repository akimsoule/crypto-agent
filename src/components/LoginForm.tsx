import { useState } from 'react';
import { LogIn, Eye, EyeOff, Lock, User, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(username, password);
      
      if (success) {
        onLoginSuccess?.();
      } else {
        setError('Identifiants incorrects. Vérifiez votre email et mot de passe.');
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mb-4 flex justify-center">
              <img 
                src="/logo.png" 
                alt="Crypto Investors Hub Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold">Administration</h1>
            <p className="text-base-content/70">
              Connectez-vous pour accéder au panel admin
            </p>
          </div>

          {/* Lien retour vers l'accueil */}
          <div className="mb-4">
            <Link 
              to="/"
              className="btn btn-ghost btn-sm w-full justify-start gap-2 text-base-content/70 hover:text-base-content"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Link>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Champ Username */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10"
                  placeholder="votre@email.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Champ Password */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Mot de passe</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input input-bordered w-full pl-10 pr-10"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-base-content/40" />
                  ) : (
                    <Eye className="h-5 w-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Bouton de connexion */}
            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isLoading || !username || !password}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Connexion...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Se connecter
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Informations */}
          <div className="divider"></div>
          <div className="text-center text-sm text-base-content/60">
            <p>🔒 Accès réservé aux administrateurs</p>
            <p className="mt-1">
              Panel d'administration pour Crypto Investors Hub
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
