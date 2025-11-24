// src/components/public/PublicLayout.tsx

import React from 'react';
import { AppHeader } from './AppHeader';
import { FullFooter } from './FullFooter';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <AppHeader />
      <main className="flex-1">
        {children}
      </main>
      <FullFooter badgePath="/assets/public/BndyBeatBadge.png" />
    </div>
  );
};

export default PublicLayout;
