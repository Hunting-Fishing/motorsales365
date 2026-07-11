import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, UserPlus, Dumbbell, CheckCircle } from 'lucide-react';

export default function PTPortalRegister() {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" }); return; }
    if (password.length < 6) { toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/pt-portal/login`, data: { first_name: firstName, last_name: lastName } }
      });
      if (error) throw error;
      setRegistered(true);
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message || "Failed to create account.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (registered) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"><CheckCircle className="h-8 w-8 text-green-600" /></div>
          <h2 className="text-2xl font-bold">Account Created!</h2>
          <p className="text-muted-foreground">Check your email to verify your account. Your trainer will link you to their system.</p>
          <Link to="/pt-portal/login"><Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white mt-4">Go to Sign In</Button></Link>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/pt-portal" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center"><Dumbbell className="h-6 w-6 text-white" /></div>
            <span className="text-xl font-bold">Fitness Portal</span>
          </Link>
        </div>
        <Card className="shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mb-2"><UserPlus className="h-8 w-8 text-white" /></div>
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>Register to access your fitness portal</CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Phone (optional)</Label><Input type="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
              <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} /></div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating Account...</> : <><UserPlus className="h-4 w-4 mr-2" />Create Account</>}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/pt-portal/login" className="text-orange-600 hover:text-orange-800 dark:text-orange-400 font-medium">Sign in</Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
