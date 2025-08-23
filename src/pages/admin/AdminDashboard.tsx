import { 
  Users, 
  TrendingUp, 
  BarChart3, 
  Shield,
  Database,
  Zap,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import FacebookManager from '../../components/FacebookManager';
import DatabaseSeedButton from '../../components/DatabaseSeedButton';
import ResetDataButton from '../../components/ResetDataButton';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminPageLayout from '../../components/AdminPageLayout';

export default function AdminDashboard() {

  const quickStats = [
    {
      title: 'Abonnés Newsletter',
      value: '150+',
      icon: Users,
      color: 'text-primary'
    },
    {
      title: 'Posts Facebook',
      value: '24',
      icon: TrendingUp,
      color: 'text-success'
    },
    {
      title: 'Investisseurs IA',
      value: '5',
      icon: BarChart3,
      color: 'text-info'
    },
    {
      title: 'Uptime',
      value: '99.9%',
      icon: Shield,
      color: 'text-warning'
    }
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Dashboard Administrateur"
        description="Centre de contrôle pour Crypto Investors Hub"
        icon={<Settings className="w-8 h-8 sm:w-10 sm:h-10" />}
      />
      
      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {quickStats.map((stat) => (
            <div key={stat.title} className="card bg-base-100 shadow-lg">
              <div className="card-body p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-base-content/70 truncate">{stat.title}</p>
                    <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${stat.color} flex-shrink-0`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modules d'administration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Newsletter Module */}
          <Link 
            to="/admin/newsletter"
            className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
          >
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-primary text-white flex-shrink-0">
                  📧
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="card-title text-lg sm:text-xl mb-1 sm:mb-2">Newsletter</h3>
                  <p className="text-sm sm:text-base text-base-content/70 mb-2 sm:mb-3">
                    Gérez les abonnés et envoyez des newsletters
                  </p>
                  <div className="badge badge-outline text-xs sm:text-sm">150+ abonnés</div>
                </div>
                <div className="text-base-content/40 flex-shrink-0">
                  →
                </div>
              </div>
            </div>
          </Link>

          {/* Facebook Admin Module */}
          <Link 
            to="/admin/facebook"
            className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
          >
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-blue-600 text-white flex-shrink-0">
                  📘
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="card-title text-lg sm:text-xl mb-1 sm:mb-2">Facebook</h3>
                  <p className="text-sm sm:text-base text-base-content/70 mb-2 sm:mb-3">
                    Configuration et paramètres avancés
                  </p>
                  <div className="badge badge-outline text-xs sm:text-sm">Configuration</div>
                </div>
                <div className="text-base-content/40 flex-shrink-0">
                  →
                </div>
              </div>
            </div>
          </Link>

          {/* Placeholder pour futur module */}
          <div className="card bg-base-100 shadow-lg border-dashed border-2 border-base-300">
            <div className="card-body p-4 sm:p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-2 sm:p-3 rounded-lg bg-base-300 text-base-content/50 flex-shrink-0">
                  ⚡
                </div>
              </div>
              <h3 className="text-lg sm:text-xl mb-1 sm:mb-2 text-base-content/70">Module à venir</h3>
              <p className="text-sm sm:text-base text-base-content/50">
                Nouvelles fonctionnalités bientôt disponibles
              </p>
            </div>
          </div>
        </div>

        {/* Facebook Manager intégré */}
        <div className="mb-6 sm:mb-8">
          <FacebookManager 
            onPostSuccess={(message: string) => {
              console.log('✅ Publication Facebook réussie:', message);
            }}
          />
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Statut du système */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2 mb-4">
                <Database className="w-5 h-5" />
                Statut du Système
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Base de données</span>
                  <div className="badge badge-success">✅ Connectée</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Facebook</span>
                  <div className="badge badge-success">✅ Active</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cron Jobs</span>
                  <div className="badge badge-success">✅ Fonctionnels</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Anti-spam</span>
                  <div className="badge badge-success">🛡️ Actif</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5" />
                Actions Rapides
              </h3>
              <div className="space-y-3">
                <button className="btn btn-outline btn-sm w-full justify-start">
                  📧 Envoyer Newsletter
                </button>
                <button className="btn btn-outline btn-sm w-full justify-start">
                  📘 Poster sur Facebook
                </button>
                <button className="btn btn-outline btn-sm w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Voir Analytics
                </button>
              </div>
            </div>
          </div>

          {/* Gestion Base de Données */}
          <div className="flex flex-col md:flex-row gap-4">
            <DatabaseSeedButton variant="card" className="flex-1" />
            <ResetDataButton variant="card" className="flex-1" />
          </div>
        </div>

        {/* Activité récente */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title mb-4">Activité Récente</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                <div className="flex items-center justify-center bg-primary text-primary-content rounded-full w-8 h-8">
                  📧
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Newsletter envoyée</p>
                  <p className="text-xs text-base-content/70">Il y a 2 heures</p>
                </div>
                <div className="badge badge-success badge-sm">Succès</div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                <div className="flex items-center justify-center bg-blue-500 text-white rounded-full w-8 h-8">
                  📘
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Post Facebook automatique</p>
                  <p className="text-xs text-base-content/70">Il y a 4 heures</p>
                </div>
                <div className="badge badge-success badge-sm">Publié</div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                <div className="flex items-center justify-center bg-info text-white rounded-full w-8 h-8">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nouvel abonné newsletter</p>
                  <p className="text-xs text-base-content/70">Il y a 6 heures</p>
                </div>
                <div className="badge badge-info badge-sm">Nouveau</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-base-300">
          <div className="text-center text-sm text-base-content/60">
            <p>Dashboard Administrateur - Crypto Investors Hub</p>
            <p className="mt-1">
              🚀 Gérez votre plateforme crypto en un seul endroit
            </p>
          </div>
        </footer>
    </AdminPageLayout>
  );
}
