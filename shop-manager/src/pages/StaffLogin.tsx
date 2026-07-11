import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wrench, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Shield, 
  Zap, 
  Users,
  CheckCircle2,
  Sparkles,
  LogOut,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthUser } from '@/hooks/useAuthUser';
import { AuthService } from '@/lib/services/AuthService';
import { getPostLoginDestination } from '@/lib/auth/getPostLoginDestination';
import staffLoginBg from '@/assets/staff-login-bg.jpg';

export default function StaffLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuthUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  // Handle "Continue" for already authenticated users
  const handleContinue = async () => {
    if (!user) return;
    setIsNavigating(true);
    try {
      const destination = await getPostLoginDestination(user.id);
      navigate(destination);
    } catch (error) {
      console.error('Error navigating:', error);
      navigate('/module-hub');
    } finally {
      setIsNavigating(false);
    }
  };

  // Handle sign out for already authenticated users
  const handleSignOut = async () => {
    setIsNavigating(true);
    try {
      await AuthService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      setIsNavigating(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profileData) {
          console.warn('No profile found for user, allowing login');
        }

        // Determine the correct destination based on user's modules
        const destination = await getPostLoginDestination(data.user.id);
        navigate(destination);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
            <Sparkles className="h-8 w-8 animate-pulse text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Already authenticated - show "Already Signed In" UI instead of auto-redirecting
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-lg">
            <CardContent className="pt-8 pb-8 space-y-6">
              {/* Header */}
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Wrench className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Already Signed In</h2>
                  <p className="text-muted-foreground mt-1">
                    You're logged in as <span className="font-medium text-foreground">{user.email}</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={handleContinue}
                  disabled={isNavigating}
                  className="w-full h-12 text-base font-semibold gap-2"
                >
                  {isNavigating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Continue to App
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isNavigating}
                  className="w-full h-12 text-base font-semibold gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out / Switch Account
                </Button>
              </div>

              {/* Back to Home */}
              <div className="text-center">
                <Link 
                  to="/" 
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding & Features with Background Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img 
          src={staffLoginBg} 
          alt="Professional team collaboration" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/75 to-primary/60" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/10 rounded-full" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          {/* Logo */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur group-hover:bg-white/30 transition-colors">
                <Wrench className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold">All Business 365</span>
            </Link>
          </div>
          
          {/* Main Message */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
                Manage Your Business
                <br />
                <span className="text-white/80">Like a Pro</span>
              </h1>
              <p className="text-lg text-white/70 max-w-md">
                Access powerful tools to streamline operations, delight customers, and grow your service business.
              </p>
            </div>
            
            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: Zap, text: 'Real-time dashboard & analytics' },
                { icon: Users, text: 'Customer & team management' },
                { icon: Shield, text: 'Secure & reliable platform' },
              ].map((feature, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 text-white/90"
                >
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Social Proof */}
          <div className="space-y-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className="w-10 h-10 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center backdrop-blur"
                >
                  <Users className="h-4 w-4 text-white/80" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-primary flex items-center justify-center backdrop-blur text-sm font-bold">
                +99
              </div>
            </div>
            <p className="text-white/70 text-sm">
              Join <span className="text-white font-semibold">1,000+</span> service professionals already using our platform
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b bg-muted/30">
          <Link to="/" className="inline-flex items-center gap-2 text-foreground">
            <Wrench className="h-5 w-5 text-primary" />
            <span className="font-bold">All Business 365</span>
          </Link>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Back Link */}
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
            
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-4">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary text-xs font-medium">Staff Portal</span>
              </div>
              <h2 className="text-3xl font-bold text-foreground">
                Welcome back
              </h2>
              <p className="text-muted-foreground">
                Sign in to access your dashboard and tools
              </p>
            </div>
            
            {/* Error Alert */}
            {error && (
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Login Form */}
            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0 space-y-6">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground font-medium">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 bg-muted/50 border-border/50 focus:bg-background transition-colors"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-foreground font-medium">
                        Password
                      </Label>
                      <button 
                        type="button"
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-12 bg-muted/50 border-border/50 focus:bg-background transition-colors pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold gap-2" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <CheckCircle2 className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
                
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">
                      or continue as
                    </span>
                  </div>
                </div>
                
                {/* Customer Portal Link */}
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Are you a customer looking to check your service status?
                  </p>
                  <Link to="/customer-portal">
                    <Button variant="outline" className="w-full h-11 gap-2">
                      <Users className="h-4 w-4" />
                      Go to Customer Portal
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* Footer Trust Badges */}
            <div className="pt-6 border-t border-border/50">
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span>Secure Login</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>Fast Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Footer */}
        <div className="p-4 border-t text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} All Business 365. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
