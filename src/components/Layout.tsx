import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Settings, 
  Mail, 
  Facebook, 
  Menu, 
  X, 
  LogOut, 
  Users,
  TrendingUp
} from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  icon: typeof Home;
  label: string;
  requireAuth?: boolean;
}

const navItems: NavItem[] = [
  {
    to: '/',
    icon: Home,
    label: 'Accueil'
  },
  {
    to: '/admin',
    icon: Settings,
    label: 'Dashboard Admin',
    requireAuth: true
  },
  {
    to: '/admin/newsletter',
    icon: Mail,
    label: 'Newsletter',
    requireAuth: true
  },
  {
    to: '/admin/facebook',
    icon: Facebook,
    label: 'Facebook',
    requireAuth: true
  }
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  // Filtrer les éléments de navigation selon l'authentification
  const filteredNavItems = navItems.filter(item => 
    !item.requireAuth || (item.requireAuth && user)
  );

  return (
    <div className="drawer drawer-end">
      <input 
        id="main-drawer" 
        type="checkbox" 
        className="drawer-toggle"
        checked={isDrawerOpen}
        onChange={toggleDrawer}
      />
      
      {/* Page content */}
      <div className="drawer-content">
        {/* Header avec bouton du menu */}
        <header className="navbar bg-base-100 shadow-lg sticky top-0 z-40">
          <div className="navbar-start">
            <Link to="/" className="btn btn-ghost text-xl">
              <img 
                src="/logo.png" 
                alt="Crypto Investors Hub Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="hidden md:inline font-bold">Crypto Investors Hub</span>
              <span className="md:hidden font-bold">CIH</span>
            </Link>
          </div>

          <div className="navbar-center">
            {/* Le menu drawer remplace la navigation desktop */}
          </div>

          <div className="navbar-end">
            <div className="flex items-center gap-2">
              {/* User info desktop */}
              {user && (
                <div className="hidden md:flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">{user.username}</div>
                    <div className="text-xs text-base-content/60">Administrateur</div>
                  </div>
                  <button 
                    onClick={logout}
                    className="btn btn-ghost btn-sm"
                    title="Déconnexion"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Menu burger - visible sur toutes les tailles d'écran */}
              <label 
                htmlFor="main-drawer" 
                className="btn btn-square btn-ghost drawer-button"
                title="Ouvrir le menu"
              >
                {isDrawerOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </label>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main>
          {children}
        </main>
      </div>

      {/* Sidebar / Drawer */}
      <div className="drawer-side">
        <label htmlFor="main-drawer" aria-label="close sidebar" className="drawer-overlay" onClick={closeDrawer}></label>
        
        <aside className="bg-base-200 text-base-content min-h-full w-80 p-4">
          {/* Header du drawer */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Crypto Investors Hub Logo" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h2 className="font-bold text-lg">Crypto Investors Hub</h2>
                <p className="text-xs text-base-content/60">Navigation</p>
              </div>
            </div>
            <button 
              onClick={closeDrawer}
              className="btn btn-ghost btn-sm btn-square"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation menu */}
          <div className="space-y-4">
            {/* Navigation principale */}
            <div>
              <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide mb-2 px-3">
                Navigation
              </h3>
              <ul className="menu w-full">
                {filteredNavItems.filter(item => !item.requireAuth).map((item) => (
                  <li key={item.to}>
                    <Link 
                      to={item.to} 
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        location.pathname === item.to 
                          ? 'bg-primary text-primary-content' 
                          : 'hover:bg-base-300'
                      }`}
                      onClick={closeDrawer}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-base">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation administration - visible seulement si connecté */}
            {user && (
              <div>
                <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide mb-2 px-3">
                  Administration
                </h3>
                <ul className="menu w-full">
                  {filteredNavItems.filter(item => item.requireAuth).map((item) => (
                    <li key={item.to}>
                      <Link 
                        to={item.to} 
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          location.pathname === item.to 
                            ? 'bg-primary text-primary-content' 
                            : 'hover:bg-base-300'
                        }`}
                        onClick={closeDrawer}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-base">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lien de connexion pour les utilisateurs non connectés */}
            {!user && (
              <div>
                <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide mb-2 px-3">
                  Administration
                </h3>
                <ul className="menu w-full">
                  <li>
                    <Link 
                      to="/admin" 
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        location.pathname === '/admin' 
                          ? 'bg-primary text-primary-content' 
                          : 'hover:bg-base-300'
                      }`}
                      onClick={closeDrawer}
                    >
                      <Settings className="w-5 h-5" />
                      <span className="text-base">Se connecter</span>
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Section utilisateur dans le drawer */}
          {user && (
            <div className="mt-auto pt-6 border-t border-base-300 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-base-300 rounded-lg">
                <div className="flex">
                  <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center">
                    <span className="text-lg font-bold">{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{user.username}</div>
                  <div className="text-xs text-base-content/60">Administrateur</div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  logout();
                  closeDrawer();
                }}
                className="btn btn-error btn-outline w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </button>
            </div>
          )}

          {/* Sélecteur de thème dans le drawer */}
          <div className={user ? "mt-4" : "mt-auto pt-6 border-t border-base-300"}>
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide">
                Apparence
              </h3>
              <ThemeSelector />
            </div>
          </div>

          {/* Quick stats dans le drawer */}
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide">
              Statistiques rapides
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="stat bg-base-100 rounded-lg p-3">
                <div className="stat-figure text-primary">
                  <Users className="w-6 h-6" />
                </div>
                <div className="stat-title text-xs">Abonnés</div>
                <div className="stat-value text-lg">150+</div>
              </div>
              <div className="stat bg-base-100 rounded-lg p-3">
                <div className="stat-figure text-success">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="stat-title text-xs">Gains</div>
                <div className="stat-value text-lg">+24.7%</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
