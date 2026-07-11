import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, LogIn, Dumbbell } from 'lucide-react';

export default function PTPortalLogin() {
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
        const { data: client } = await (supabase as any)
          .from('pt_clients').select('id').eq('user_id', session.user.id).maybeSingle();
        if (client) { navigate('/pt-portal/dashboard'); return; }
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
      const { data: client } = await (supabase as any)
        .from('pt_clients').select('id, first_name, last_name').eq('user_id', data.user.id).maybeSingle();
      if (!client) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "No client account found. Please register or contact your trainer.", variant: "destructive" });
        setLoading(false); return;
      }
      toast({ title: "Welcome Back!", description: `Signed in as ${client.first_name} ${client.last_name}` });
      navigate('/pt-portal/dashboard');
    } catch (error: any) {
      toast({ title: "Sign In Failed", description: error.message || "Invalid email or password", variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (checkingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/pt-portal" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center"><Dumbbell className="h-6 w-6 text-white" /></div>
            <span className="text-xl font-bold">Fitness Portal</span>
          </Link>
        </div>
        <Card className="shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mb-2"><LogIn className="h-8 w-8 text-white" /></div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Sign in to view your fitness plan</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing In...</> : <><LogIn className="h-4 w-4 mr-2" />Sign In</>}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/pt-portal/register" className="text-orange-600 hover:text-orange-800 dark:text-orange-400 font-medium">Register here</Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
