import React, { useState } from 'react';
import { WaterDeliverySidebar } from './WaterDeliverySidebar';
import { WaterDeliveryHeader } from './WaterDeliveryHeader';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface WaterDeliveryLayoutProps {
  children: React.ReactNode;
}

export function WaterDeliveryLayout({ children }: WaterDeliveryLayoutProps) {
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
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <div className={cn(
        isMobile && !mobileOpen && 'hidden',
        isMobile && mobileOpen && 'block'
      )}>
        <WaterDeliverySidebar
          collapsed={isMobile ? false : collapsed}
          onToggle={toggleSidebar}
        />
      </div>

      {/* Main Content */}
      <div
        className={cn(
          'flex flex-col min-h-screen flex-1 transition-all duration-300',
          !isMobile && !collapsed && 'ml-64',
          !isMobile && collapsed && 'ml-16',
          isMobile && 'ml-0'
        )}
      >
        <WaterDeliveryHeader onMenuToggle={toggleSidebar} />
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
