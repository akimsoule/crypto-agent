import { Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminPageHeader from '../../../components/AdminPageHeader';
import AdminPageLayout from '../../../components/AdminPageLayout';

export default function FacebookAdmin() {
  return (
    <AdminPageLayout maxWidth="4xl">
      <AdminPageHeader
        title="Configuration Facebook"
        description="Paramètres avancés et configuration du système Facebook"
        icon={<Facebook className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />}
      />

      {/* Contenu principal */}
      <div className="space-y-6">
        {/* Redirection vers le dashboard */}
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="font-bold">Gestion Facebook déplacée</h3>
            <div className="text-sm mt-1">
              La gestion des publications Facebook est maintenant disponible directement dans le dashboard principal.
              <Link to="/admin" className="link link-primary ml-2 block sm:inline">
                Aller au dashboard →
              </Link>
            </div>
          </div>
        </div>

        {/* Configuration technique */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2">
                🔧 Configuration Technique
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Token Facebook</span>
                  <div className="badge badge-success">✅ Configuré</div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Page ID</span>
                  <div className="badge badge-success">✅ Configuré</div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Webhooks</span>
                  <div className="badge badge-warning">⚠️ En attente</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2">
                📊 Statistiques
              </h3>
              <div className="space-y-3">
                <div className="stat">
                  <div className="stat-title text-xs">Posts automatiques</div>
                  <div className="stat-value text-2xl">24</div>
                  <div className="stat-desc">Ce mois-ci</div>
                </div>
                <div className="stat">
                  <div className="stat-title text-xs">Engagement moyen</div>
                  <div className="stat-value text-2xl">12.4%</div>
                  <div className="stat-desc text-success">↗︎ +2.1%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title">Actions rapides</h3>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/admin" 
                className="btn btn-primary"
              >
                📘 Aller au Dashboard
              </Link>
              <button className="btn btn-outline">
                🔄 Renouveler Token
              </button>
              <button className="btn btn-outline">
                📈 Voir Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}