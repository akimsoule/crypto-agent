import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import type { Theme } from '../../types/ui';

const themes: Theme[] = [
  { name: 'light', label: 'Clair', colors: ['#ffffff', '#f3f4f6'] },
  { name: 'dark', label: 'Sombre', colors: ['#1f2937', '#374151'] },
  { name: 'cupcake', label: 'Cupcake', colors: ['#fef2f2', '#fecaca'] },
  { name: 'bumblebee', label: 'Abeille', colors: ['#fef3c7', '#fbbf24'] },
  { name: 'emerald', label: 'Emeraude', colors: ['#ecfdf5', '#10b981'] },
  { name: 'corporate', label: 'Corporate', colors: ['#f8fafc', '#3b82f6'] },
  { name: 'synthwave', label: 'Synthwave', colors: ['#2d1b69', '#f472b6'] },
  { name: 'retro', label: 'Rétro', colors: ['#fef3c7', '#f59e0b'] },
  { name: 'cyberpunk', label: 'Cyberpunk', colors: ['#ffff00', '#ff00ff'] },
  { name: 'valentine', label: 'Valentine', colors: ['#fdf2f8', '#ec4899'] },
  { name: 'halloween', label: 'Halloween', colors: ['#ff6600', '#000000'] },
  { name: 'garden', label: 'Jardin', colors: ['#f0fdf4', '#16a34a'] },
  { name: 'forest', label: 'Forêt', colors: ['#052e16', '#15803d'] },
  { name: 'aqua', label: 'Aqua', colors: ['#f0fdfa', '#0891b2'] },
  { name: 'lofi', label: 'Lo-Fi', colors: ['#0f0f0f', '#fbbf24'] },
  { name: 'pastel', label: 'Pastel', colors: ['#fef7ff', '#c084fc'] },
  { name: 'fantasy', label: 'Fantasy', colors: ['#f8fafc', '#7c3aed'] },
  { name: 'wireframe', label: 'Wireframe', colors: ['#ffffff', '#000000'] },
  { name: 'black', label: 'Black', colors: ['#000000', '#404040'] },
  { name: 'luxury', label: 'Luxe', colors: ['#ffffff', '#ca8a04'] },
  { name: 'dracula', label: 'Dracula', colors: ['#282a36', '#6272a4'] },
  { name: 'cmyk', label: 'CMYK', colors: ['#ffffff', '#0891b2'] },
  { name: 'autumn', label: 'Automne', colors: ['#8b0000', '#ff8c00'] },
  { name: 'business', label: 'Business', colors: ['#1c4532', '#047857'] },
  { name: 'acid', label: 'Acid', colors: ['#ff00ff', '#00ff00'] },
  { name: 'lemonade', label: 'Limonade', colors: ['#fef3c7', '#65a30d'] },
  { name: 'night', label: 'Nuit', colors: ['#0f172a', '#1e293b'] },
  { name: 'coffee', label: 'Café', colors: ['#78350f', '#a16207'] },
  { name: 'winter', label: 'Hiver', colors: ['#f1f5f9', '#3b82f6'] },
  { name: 'dim', label: 'Tamisé', colors: ['#1f2937', '#6b7280'] },
  { name: 'nord', label: 'Nord', colors: ['#2e3440', '#5e81ac'] },
  { name: 'sunset', label: 'Coucher', colors: ['#ff4500', '#ffff00'] }
];

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Charger le thème sauvegardé au montage du composant
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []); // Déclenché uniquement au montage

  const changeTheme = (themeName: string) => {
    setCurrentTheme(themeName);
    localStorage.setItem('theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      {/* Dropdown pour sélectionner le thème */}
      <div className="dropdown dropdown-end w-full" onClick={() => setIsOpen(!isOpen)}>
        <div
          tabIndex={0}
          role="button"
          className="btn btn-outline w-full justify-start gap-2"
        >
          <Palette className="w-4 h-4" />
          <span className="flex-1 text-left">Thème: {themes.find(t => t.name === currentTheme)?.label}</span>
          <span className="text-xs">▼</span>
        </div>
        
        {isOpen && (
          <div className="dropdown-content bg-base-100 rounded-box w-full shadow-2xl border border-base-300 max-h-80 overflow-y-auto mt-2 z-50">
            <div className="p-4">
              <h3 className="font-bold text-lg mb-3 text-center">
                Choisir un thème
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.name}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all text-left w-full ${
                      currentTheme === theme.name
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-base-300 hover:border-primary/50 hover:bg-base-200'
                    }`}
                    onClick={() => changeTheme(theme.name)}
                  >
                    <div className="flex space-x-1">
                      {theme.colors.map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-full border border-base-300"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="flex-1 text-sm font-medium">
                      {theme.label}
                    </span>
                    {currentTheme === theme.name && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Backdrop pour fermer le dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
