import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Building2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { getShopBySlug, ShopPublicInfo } from '@/services/shopLookupService';
import { CustomerPortalLayout } from '@/components/customer-portal/CustomerPortalLayout';

export default function CustomerPortalLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Shop context
  const [shop, setShop] = useState<ShopPublicInfo | null>(null);
  const [shopLoading, setShopLoading] = useState(true);

  // Load shop from URL params only - no automatic session redirect
  useEffect(() => {
    const loadShopContext = async () => {
      const shopSlug = searchParams.get('shop');
      
      if (shopSlug) {
        const shopData = await getShopBySlug(shopSlug);
        if (shopData) setShop(shopData);
      }
      
      setShopLoading(false);
    };
    
    loadShopContext();
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if this user is linked to a customer account
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('user_id', data.user.id)
        .single();

      if (customerError || !customer) {
        // Not a customer account, sign out
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "No customer account is linked to this email. Please contact us for assistance.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: `Logged in as ${customer.first_name} ${customer.last_name}`,
      });

      navigate('/customer-portal/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <CustomerPortalLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        {/* Background decoration */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10 fade-in">
        {/* Back link */}
        <Link 
          to="/customer-portal" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back to Customer Portal</span>
        </Link>

        {/* Main card */}
        <div className="modern-card-floating p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            {shop ? (
              <>
                {shop.logo_url ? (
                  <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden shadow-lg ring-4 ring-primary/10">
                    <img 
                      src={shop.logo_url} 
                      alt={shop.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                    <Building2 className="h-10 w-10 text-primary-foreground" />
                  </div>
                )}
                <div className="space-y-1">
                  <h1 className="text-2xl font-heading font-bold text-foreground">
                    Welcome Back
                  </h1>
                  <p className="text-muted-foreground">
                    Sign in to <span className="font-medium text-foreground">{shop.name}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg pulse-glow">
                  <LogIn className="h-10 w-10 text-primary-foreground" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-heading font-bold text-foreground">
                    Customer Portal
                  </h1>
                  <p className="text-muted-foreground">
                    Sign in to access your account
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 h-12 bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 btn-gradient-primary font-medium text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">New here?</span>
            </div>
          </div>

          {/* Register link */}
          <div className="text-center">
            <Link 
              to={shop ? `/customer-portal/register?shop=${shop.slug}` : '/customer-portal/register'} 
              className="inline-flex items-center justify-center w-full h-12 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 text-foreground font-medium transition-all hover:border-primary/30"
            >
              Create an Account
            </Link>
          </div>
        </div>

          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </CustomerPortalLayout>
  );
}
