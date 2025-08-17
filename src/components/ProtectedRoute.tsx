import { useAuth } from '../hooks/useAuth';
import LoginForm from './LoginForm';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Afficher un loader pendant la vérification du token
  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4 text-base-content/70">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Si non authentifié, afficher le formulaire de connexion
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Si authentifié, afficher le contenu protégé
  return <>{children}</>;
}
