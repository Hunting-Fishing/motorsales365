import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const AccountMenu = () => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center space-x-2">
      <Link to="/account">
        <Button variant="ghost" size="sm">
          <User className="h-4 w-4 mr-2" />
          Account
        </Button>
      </Link>
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};