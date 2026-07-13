import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Menu, Search, Settings, LogOut, User, Fuel } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

interface FuelDeliveryHeaderProps {
  onMenuToggle: () => void;
}

export function FuelDeliveryHeader({ onMenuToggle }: FuelDeliveryHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const isMobile = useIsMobile();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - Business name and search */}
        <div className="flex items-center gap-4">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onMenuToggle}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {/* Business Name */}
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/fuel-delivery')}
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Fuel className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground hidden sm:block truncate max-w-[180px]">
              {moduleInfo?.displayName || 'Fuel Delivery'}
            </span>
          </div>

          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers..."
              className="pl-9 w-64 bg-muted/50"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user?.email?.substring(0, 2).toUpperCase() || 'FD'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Fuel Delivery Manager</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/fuel-delivery/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/fuel-delivery/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
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
