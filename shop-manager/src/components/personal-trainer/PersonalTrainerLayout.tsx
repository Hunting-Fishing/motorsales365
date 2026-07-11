import React, { useState } from 'react';
import { PersonalTrainerSidebar } from './PersonalTrainerSidebar';
import { PersonalTrainerHeader } from './PersonalTrainerHeader';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface PersonalTrainerLayoutProps {
  children: React.ReactNode;
}

export function PersonalTrainerLayout({ children }: PersonalTrainerLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}
      <div className={cn(
        isMobile && !mobileOpen && 'hidden',
        isMobile && mobileOpen && 'block'
      )}>
        <PersonalTrainerSidebar collapsed={isMobile ? false : collapsed} onToggle={toggleSidebar} />
      </div>
      <div className={cn(
        'flex flex-col min-h-screen flex-1 transition-all duration-300',
        !isMobile && !collapsed && 'ml-64',
        !isMobile && collapsed && 'ml-16',
        isMobile && 'ml-0'
      )}>
        <PersonalTrainerHeader onMenuToggle={toggleSidebar} />
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
}
