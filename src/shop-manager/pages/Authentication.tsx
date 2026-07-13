import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthService } from '@/lib/services/AuthService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPostLoginDestination } from '@/lib/auth/getPostLoginDestination';
import { ArrowRight, LogOut, Sparkles } from 'lucide-react';

export default function Authentication() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuthUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { toast } = useToast();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await AuthService.signUp(email, password, { firstName, lastName });
        if (error) {
          toast({
            title: "Sign Up Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Please check your email to confirm your account.",
          });
        }
      } else {
        const { error, data } = await AuthService.signIn(email, password);
        if (error) {
          toast({
            title: "Sign In Error",
            description: error.message,
            variant: "destructive",
          });
        } else if (data?.success) {
          // Get the user and navigate to appropriate destination
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const destination = await getPostLoginDestination(user.id);
            navigate(destination);
          } else {
            navigate('/module-hub');
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading only for a brief moment
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold">
              Already Signed In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              You're logged in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
            
            <Button 
              onClick={handleContinue}
              disabled={isNavigating}
              className="w-full gap-2"
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
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out / Switch Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the login/signup form if not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-blue-600 hover:underline"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
