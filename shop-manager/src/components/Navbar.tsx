
import React from 'react';
import { Bell, ChevronDown, Search, Settings, User, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { AuthService } from '@/lib/services/AuthService';

const Navbar: React.FC = () => {
  const { user } = useAuthUser();
  const { userRole, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      toast({
        title: "Logging out",
        description: "Please wait..."
      });
      
      // Use centralized AuthService which handles cleanup and redirect
      await AuthService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Force navigation even on error
      window.location.replace('/login?logout=true');
    }
  };

  const goToSettings = () => {
    navigate('/customer-portal?tab=profile');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'default';
      case 'admin':
      case 'administrator':
        return 'destructive';
      case 'manager':
        return 'secondary';
      case 'technician':
        return 'outline';
      case 'customer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const displayRole = userRole?.displayName || userRole?.name || 'User';
  
  return (
    <header className="bg-background border-b border-border h-16 flex items-center px-4 md:px-6">
      <div className="flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10 rounded-full"
            aria-label="Search"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 inline-block h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 cursor-pointer hover:bg-accent rounded-lg p-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="font-medium text-sm">{user?.email}</span>
              {!roleLoading && (
                <Badge 
                  variant={getRoleBadgeVariant(displayRole)} 
                  className="text-xs h-4 px-1 mt-1"
                >
                  {displayRole}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm">
              <div className="font-medium">{user?.email}</div>
              {!roleLoading && (
                <div className="text-xs text-muted-foreground mt-1">
                  Role: {displayRole}
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={goToSettings} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Navbar;
