import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, LogIn, Droplets } from 'lucide-react';

export default function WaterDeliveryPortalLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: customer } = await supabase
          .from('customers').select('id').eq('user_id', session.user.id).single();
        if (customer) { navigate('/water-delivery-portal/dashboard'); return; }
      }
      setCheckingAuth(false);
    };
    check();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: cust } = await supabase
        .from('customers').select('id, first_name, last_name').eq('user_id', data.user.id).single();
      if (!cust) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "No customer account found. Please register or contact your water delivery provider.", variant: "destructive" });
        setLoading(false); return;
      }
      const customerName = `${cust.first_name} ${cust.last_name}`;
      toast({ title: "Welcome Back!", description: `Signed in as ${customerName}` });
      navigate('/water-delivery-portal/dashboard');
    } catch (error: any) {
      toast({ title: "Sign In Failed", description: error.message || "Invalid email or password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/water-delivery-portal" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-cyan-700 rounded-lg flex items-center justify-center"><Droplets className="h-6 w-6 text-white" /></div>
            <span className="text-xl font-bold">Water Delivery Portal</span>
          </Link>
        </div>
        <Card className="shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-cyan-700 rounded-full flex items-center justify-center mb-2"><LogIn className="h-8 w-8 text-white" /></div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Sign in to manage your water deliveries</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-cyan-700 hover:bg-cyan-800 text-white" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing In...</> : <><LogIn className="h-4 w-4 mr-2" />Sign In</>}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/water-delivery-portal/register" className="text-cyan-700 hover:text-cyan-900 dark:text-cyan-400 dark:hover:text-cyan-300 font-medium">Register here</Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
