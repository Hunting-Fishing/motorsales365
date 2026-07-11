import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, LogIn, Container } from 'lucide-react';

export default function SepticPortalLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user has a customer record linked to septic tanks
        const { data: customer } = await (supabase as any)
          .from('septic_customers')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        
        if (customer) {
          // Check if they have septic tanks
          const { data: tanks } = await supabase
            .from('septic_tanks')
            .select('id')
            .eq('customer_id', customer.id)
            .limit(1);
          
          if (tanks && tanks.length > 0) {
            navigate('/septic-portal/dashboard');
            return;
          }
        }
      }
      setCheckingAuth(false);
    };

    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if this user has a customer record
      const { data: customer } = await (supabase as any)
        .from('septic_customers')
        .select('id, first_name, last_name')
        .eq('user_id', data.user.id)
        .single();

      if (!customer) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "No customer account found for this email. Please register or contact your septic service provider.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Welcome Back!",
        description: `Signed in as ${customer.first_name} ${customer.last_name}`,
      });

      navigate('/septic-portal/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-stone-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/septic-portal" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-stone-700 rounded-lg flex items-center justify-center">
              <Container className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">Septic Portal</span>
          </Link>
        </div>

        <Card className="shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-stone-700 rounded-full flex items-center justify-center mb-2">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to manage your septic system
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full bg-stone-700 hover:bg-stone-800 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link 
                  to="/septic-portal/register" 
                  className="text-stone-700 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-300 font-medium"
                >
                  Register here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
