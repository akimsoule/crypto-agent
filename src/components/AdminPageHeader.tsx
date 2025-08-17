import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export default function AdminPageHeader({ 
  title, 
  description, 
  icon, 
  actions 
}: AdminPageHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-white p-4 sm:p-6 mb-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
              {icon}
              {title}
            </h1>
            <p className="opacity-90 text-sm sm:text-base lg:text-lg">
              {description}
            </p>
          </div>
          
          {actions && (
            <div className="flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
