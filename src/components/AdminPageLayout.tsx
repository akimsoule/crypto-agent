import type { ReactNode } from 'react';

interface AdminPageLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
  spacing?: 'tight' | 'normal' | 'loose';
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl'
};

const spacingClasses = {
  tight: 'space-y-4',
  normal: 'space-y-6',
  loose: 'space-y-8'
};

export default function AdminPageLayout({ 
  children, 
  maxWidth = '6xl',
  spacing = 'normal'
}: AdminPageLayoutProps) {
  return (
    <div className="min-h-screen bg-base-200">
      <div className={`container mx-auto ${maxWidthClasses[maxWidth]} p-4 sm:p-6`}>
        <div className={spacingClasses[spacing]}>
          {children}
        </div>
      </div>
    </div>
  );
}
