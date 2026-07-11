import { ReactNode } from 'react';
import { useShopId } from '@/hooks/useShopId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ShopGuardProps {
  children: ReactNode;
}

/**
 * ShopGuard prevents users without a shop_id from accessing protected content.
 * This is a critical security component that ensures multi-tenant data isolation.
 */
export function ShopGuard({ children }: ShopGuardProps) {
  const { shopId, loading, error, refetch } = useShopId();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-destructive">Error Loading Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              {error.message || 'There was a problem loading your profile.'}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={refetch} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
              <Button onClick={handleLogout} variant="outline" className="w-full">
                Return to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // CRITICAL: Block access for users without shop_id
  if (!shopId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Company Setup Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Your account is not yet associated with a company. Please contact your administrator 
              to be added to your company's workspace, or complete your company registration.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/onboarding')} className="w-full">
                Complete Registration
              </Button>
              <Button onClick={handleLogout} variant="outline" className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
