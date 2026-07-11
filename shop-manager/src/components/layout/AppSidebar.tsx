
import React from 'react';
import { useSidebar } from '@/hooks/use-sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { SidebarContent } from './sidebar/SidebarContent';

export function AppSidebar() {
  const { isOpen, toggle } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-sm"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 left-0 z-30 h-full w-[280px] transition-transform duration-300 shadow-soft print:hidden',
          'bg-sidebar border-r border-sidebar-border',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </div>
    </>
  );
}
