import React from 'react';
import { SidebarProvider, useSidebar } from '@/hooks/use-sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { AppFooter } from './AppFooter';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  // Use mobile layout for mobile devices
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOpen } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />
      <div className={`flex flex-col min-h-screen flex-1 transition-all duration-300 ease-in-out ${
        !isMobile && isOpen ? 'ml-[280px] print:ml-0' : 'ml-0'
      }`}>
        <Header />
        <main className="flex-1 w-full print:w-full">
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
};
