import React from 'react';
import { Menu, Bell, Search, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AuthService } from '@/lib/services/AuthService';
import { toast } from '@/hooks/use-toast';

interface PersonalTrainerHeaderProps {
  onMenuToggle?: () => void;
}

export function PersonalTrainerHeader({ onMenuToggle }: PersonalTrainerHeaderProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { userId, userName } = useAuthUser();

  const { data: profile } = useQuery({
    queryKey: ['header-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : userName?.split('@')[0] || 'User';

  const initials = profile
    ? `${(profile.first_name?.[0] || '')}${(profile.last_name?.[0] || '')}`.toUpperCase()
    : (displayName?.[0] || 'U').toUpperCase();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          {isMobile && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="hidden md:flex items-center gap-2 w-64">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="h-9 border-none bg-muted/50 focus-visible:ring-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!isMobile && (
                  <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                    {displayName}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{userName || ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/personal-trainer/settings')}>
                Module Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/personal-trainer`)}>
                {displayName}'s Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/module-hub')}>
                All Modules
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={async () => {
                  toast({ title: 'Logging out', description: 'Please wait...' });
                  await AuthService.signOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
