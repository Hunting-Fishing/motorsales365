
import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useSidebar } from '@/hooks/use-sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function HeaderSidebarToggle() {
  const { toggle } = useSidebar();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="md:hidden"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
