import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthService } from '@/lib/services/AuthService';
import { useToast } from '@/hooks/use-toast';
import { getPostLoginDestination } from '@/lib/auth/getPostLoginDestination';
import { UserPlus, Eye, EyeOff, ArrowRight, LogOut, Sparkles } from 'lucide-react';
import ab365Logo from '@/assets/ab365-logo.png';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function Signup() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuthUser();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const { error } = await AuthService.signUp(
        formData.email,
        formData.password,
        {
          firstName: formData.firstName,
          lastName: formData.lastName
        }
      );

      if (error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account before signing in.",
        });
        // Redirect to login after successful signup
        navigate('/login');
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

  // Loading state
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
      <PublicLayout activeLink="signup">
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <div className="relative w-full max-w-md">
            <Card className="modern-card-elevated backdrop-blur-sm bg-card/95 border-border/50 shadow-glow">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <img src={ab365Logo} alt="All Business 365" className="w-16 h-16 object-contain" />
                </div>
                
                <CardTitle className="text-3xl font-heading gradient-text mb-2">
                  Already Signed In
                </CardTitle>
                <p className="text-muted-foreground font-body">
                  You're logged in as <span className="font-medium text-foreground">{user.email}</span>
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleContinue}
                  disabled={isNavigating}
                  className="w-full h-12 rounded-xl btn-gradient-primary font-semibold text-base group"
                >
                  {isNavigating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Continue to App
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isNavigating}
                  className="w-full h-12 rounded-xl font-semibold text-base gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out / Switch Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout activeLink="signup">
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="relative w-full max-w-md">
          <Card className="modern-card-elevated backdrop-blur-sm bg-card/95 border-border/50 shadow-glow">
            <CardHeader className="text-center pb-8">
              {/* Brand Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <img src={ab365Logo} alt="All Business 365" className="w-16 h-16 object-contain" />
              </div>
              
              <CardTitle className="text-3xl font-heading gradient-text mb-2">
                Create Account
              </CardTitle>
              <p className="text-muted-foreground font-body">
                Join All Business 365 today
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="John"
                      className="h-11 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      className="h-11 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john.doe@example.com"
                    className="h-11 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className="h-11 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm pr-10"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      className="h-11 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm pr-10"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl btn-gradient-primary font-semibold text-base group relative overflow-hidden transition-all duration-300 hover:shadow-glow mt-6" 
                  disabled={isSubmitting}
                >
                  <span className="flex items-center justify-center gap-3">
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        Create Account
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </span>
                </Button>
                
                <div className="text-center pt-4 border-t border-border/50">
                  <Link 
                    to="/login" 
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-300 group"
                  >
                    Already have an account? 
                    <span className="underline decoration-primary/30 group-hover:decoration-primary transition-colors duration-300">
                      Sign in
                    </span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
