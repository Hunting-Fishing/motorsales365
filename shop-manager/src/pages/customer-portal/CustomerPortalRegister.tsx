import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, UserPlus, Building2, CheckCircle, KeyRound } from 'lucide-react';
import { getShopBySlug, getShopByInviteCode, ShopPublicInfo } from '@/services/shopLookupService';
import { CustomerPortalLayout } from '@/components/customer-portal/CustomerPortalLayout';

export default function CustomerPortalRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Shop context
  const [shop, setShop] = useState<ShopPublicInfo | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [codeValidating, setCodeValidating] = useState(false);

  // Load shop from URL params
  useEffect(() => {
    const loadShopContext = async () => {
      const shopSlug = searchParams.get('shop');
      const code = searchParams.get('code');
      
      if (shopSlug) {
        const shopData = await getShopBySlug(shopSlug);
        if (shopData) setShop(shopData);
      } else if (code) {
        const shopData = await getShopByInviteCode(code);
        if (shopData) setShop(shopData);
      }
      
      setShopLoading(false);
    };
    
    loadShopContext();
  }, [searchParams]);

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        
        if (customer) {
          navigate('/customer-portal/dashboard');
          return;
        }
      }
      setCheckingAuth(false);
    };

    checkExistingSession();
  }, [navigate]);

  const validateInviteCode = async () => {
    if (!formData.inviteCode.trim()) return;
    
    setCodeValidating(true);
    const shopData = await getShopByInviteCode(formData.inviteCode);
    setCodeValidating(false);
    
    if (shopData) {
      setShop(shopData);
      setShowInviteCode(false);
      toast({
        title: "Business Found!",
        description: `You'll be registered with ${shopData.name}`,
      });
    } else {
      toast({
        title: "Invalid Code",
        description: "We couldn't find a business with that code.",
        variant: "destructive"
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    // Require a shop to be selected
    if (!shop) {
      toast({
        title: "No Business Selected",
        description: "Please enter a business code or select a business first.",
        variant: "destructive"
      });
      setShowInviteCode(true);
      return;
    }

    setLoading(true);

    try {
      // First, check if a customer with this email already exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, user_id, first_name, last_name')
        .eq('email', formData.email.toLowerCase())
        .single();

      if (existingCustomer?.user_id) {
        toast({
          title: "Account Exists",
          description: "An account with this email already exists. Please sign in instead.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Create auth user
      const redirectUrl = `${window.location.origin}/customer-portal/dashboard`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (authError) throw authError;

      if (existingCustomer) {
        // Link existing customer to the new auth user
        const { error: updateError } = await supabase
          .from('customers')
          .update({ user_id: authData.user?.id })
          .eq('id', existingCustomer.id);

        if (updateError) throw updateError;

        toast({
          title: "Account Linked!",
          description: `Welcome ${existingCustomer.first_name}! Your existing customer profile has been linked to your new account.`,
        });
      } else {
        // Create new customer record with the selected shop
        const { error: customerError } = await supabase
          .from('customers')
          .insert([{
            shop_id: shop.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email.toLowerCase(),
            phone: formData.phone || null,
            user_id: authData.user?.id,
          }]);

        if (customerError) throw customerError;

        toast({
          title: "Registration Successful!",
          description: "Please check your email to verify your account.",
        });
      }

      setRegistrationComplete(true);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <CustomerPortalLayout>
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerPortalLayout>
    );
  }

  if (registrationComplete) {
    return (
      <CustomerPortalLayout>
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-700">
                Registration Complete!
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Please check your email to verify your account, then you can sign in.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                onClick={() => navigate('/customer-portal/login')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Go to Sign In
              </Button>
            </CardFooter>
          </Card>
        </div>
      </CustomerPortalLayout>
    );
  }

  return (
    <CustomerPortalLayout>
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            {shop ? (
              <>
                {shop.logo_url ? (
                  <img 
                    src={shop.logo_url} 
                    alt={shop.name} 
                    className="w-16 h-16 mx-auto object-contain rounded-lg"
                  />
                ) : (
                  <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-2">
                    <Building2 className="h-8 w-8 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-2xl font-bold">
                    Create Account
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Register with {shop.name}
                  </CardDescription>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-2">
                  <UserPlus className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  Create Account
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Register for customer portal access
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              {/* Shop context display or invite code entry */}
              {!shop && !shopLoading && (
                <div className="bg-muted/50 border border-border/50 rounded-lg p-3">
                  {showInviteCode ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Enter Business Code</label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.inviteCode}
                          onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value.toUpperCase() })}
                          placeholder="e.g., BUCKS1"
                          className="uppercase tracking-widest text-center"
                          maxLength={10}
                        />
                        <Button 
                          type="button"
                          onClick={validateInviteCode}
                          disabled={codeValidating || !formData.inviteCode.trim()}
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                        >
                          {codeValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowInviteCode(true)}
                      className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-sm"
                    >
                      <KeyRound className="h-4 w-4" />
                      Have a business code? Enter it here
                    </button>
                  )}
                </div>
              )}
              
              {shop && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Registering with </span>
                    <span className="font-medium text-foreground">{shop.name}</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  to={shop ? `/customer-portal/login?shop=${shop.slug}` : '/customer-portal/login'} 
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Sign in here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </CustomerPortalLayout>
  );
}
