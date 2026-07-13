import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, KeyRound, Building2, Crosshair, ArrowRight, UserPlus, LogIn, MapPin, Briefcase } from 'lucide-react';
import { getShopBySlug, getShopByInviteCode, enhancedSearchShops, getAvailableIndustries, ShopPublicInfo } from '@/services/shopLookupService';
import { useToast } from '@/hooks/use-toast';
import { CustomerPortalLayout } from '@/components/customer-portal/CustomerPortalLayout';

type ConnectionMethod = 'code' | 'search' | null;

// Debounce hook for auto-search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function CustomerPortalLanding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopPublicInfo | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(null);
  
  // Invite code form
  const [inviteCode, setInviteCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  
  // Search form
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ShopPublicInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Industry filter
  const [industries, setIndustries] = useState<string[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');

  // Debounced search query for auto-search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load available industries
  useEffect(() => {
    const loadIndustries = async () => {
      const availableIndustries = await getAvailableIndustries();
      setIndustries(availableIndustries);
    };
    loadIndustries();
  }, []);

  // Check for shop context from URL params
  useEffect(() => {
    const checkShopContext = async () => {
      const shopSlug = searchParams.get('shop');
      const code = searchParams.get('code');
      
      if (shopSlug) {
        const shopData = await getShopBySlug(shopSlug);
        if (shopData) {
          setShop(shopData);
        }
      } else if (code) {
        const shopData = await getShopByInviteCode(code);
        if (shopData) {
          setShop(shopData);
        }
      }
      
      setLoading(false);
    };
    
    checkShopContext();
  }, [searchParams]);

  // Auto-search when query or industry changes
  const performSearch = useCallback(async (query: string, industry: string) => {
    if (!query.trim() && industry === 'all') {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    setSearchLoading(true);
    setHasSearched(true);
    
    const results = await enhancedSearchShops({
      query: query.trim(),
      industry: industry !== 'all' ? industry : undefined,
      limit: 50
    });
    
    setSearchResults(results);
    setSearchLoading(false);
  }, []);

  // Trigger search on debounced query or industry change
  useEffect(() => {
    if (connectionMethod === 'search') {
      performSearch(debouncedSearchQuery, selectedIndustry);
    }
  }, [debouncedSearchQuery, selectedIndustry, connectionMethod, performSearch]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    
    setCodeLoading(true);
    const shopData = await getShopByInviteCode(inviteCode);
    setCodeLoading(false);
    
    if (shopData) {
      setShop(shopData);
      setConnectionMethod(null);
    } else {
      toast({
        title: "Invalid Code",
        description: "We couldn't find a business with that code. Please check and try again.",
        variant: "destructive"
      });
    }
  };

  const selectShop = (selectedShop: ShopPublicInfo) => {
    setShop(selectedShop);
    setConnectionMethod(null);
    setSearchResults([]);
    setSearchQuery('');
    setSelectedIndustry('all');
    setHasSearched(false);
  };

  const proceedToRegister = () => {
    if (shop) {
      navigate(`/customer-portal/register?shop=${shop.slug}`);
    } else {
      navigate('/customer-portal/register');
    }
  };

  const proceedToLogin = () => {
    if (shop) {
      navigate(`/customer-portal/login?shop=${shop.slug}`);
    } else {
      navigate('/customer-portal/login');
    }
  };

  if (loading) {
    return (
      <CustomerPortalLayout>
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerPortalLayout>
    );
  }

  // If we have a shop context, show business-branded welcome
  if (shop) {
    return (
      <CustomerPortalLayout>
        <div className="flex-1 flex items-center justify-center p-4 py-12">
          <Card className="w-full max-w-md shadow-xl border-border">
          <CardHeader className="text-center space-y-4">
            {shop.logo_url ? (
              <img 
                src={shop.logo_url} 
                alt={shop.name} 
                className="w-20 h-20 mx-auto object-contain rounded-lg"
              />
            ) : (
              <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                <Building2 className="h-10 w-10 text-primary-foreground" />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {shop.name}
              </CardTitle>
              {shop.industry && (
                <Badge variant="secondary" className="mt-2">
                  {shop.industry}
                </Badge>
              )}
              <CardDescription className="mt-2">
                Welcome to our Customer Portal
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground text-sm">
              Create an account or sign in to book services, view your service history, and manage your account.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={proceedToRegister}
                className="w-full"
                size="lg"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Create Account
              </Button>
              
              <Button 
                onClick={proceedToLogin}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Sign In
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={() => setShop(null)}
              >
                Looking for a different business?
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </CustomerPortalLayout>
    );
  }

  // No shop context - show connection options
  return (
    <CustomerPortalLayout>
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-lg shadow-xl border-border">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-2">
              <Crosshair className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Customer Portal
          </CardTitle>
          <CardDescription>
            Connect with your service provider to book services and manage your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {connectionMethod === null && (
            <div className="space-y-3">
              <Button 
                onClick={() => setConnectionMethod('code')}
                variant="outline"
                className="w-full justify-between h-auto py-4 px-4 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">I have a business code</div>
                    <div className="text-sm text-muted-foreground">Enter the code from your service provider</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Button>
              
              <Button 
                onClick={() => setConnectionMethod('search')}
                variant="outline"
                className="w-full justify-between h-auto py-4 px-4 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Find a business</div>
                    <div className="text-sm text-muted-foreground">Search by name, location, or service type</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Button>
              
              <div className="pt-4 border-t">
                <p className="text-center text-sm text-muted-foreground mb-3">
                  Already have an account?
                </p>
                <Button 
                  onClick={() => navigate('/customer-portal/login')}
                  variant="ghost"
                  className="w-full"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </div>
            </div>
          )}
          
          {connectionMethod === 'code' && (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setConnectionMethod(null)}
                className="mb-2"
              >
                ← Back
              </Button>
              
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enter Business Code</label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g., BUCKS1"
                    className="text-center text-lg tracking-widest uppercase"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    This code should be on your receipt, business card, or advertisement
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={codeLoading || !inviteCode.trim()}
                >
                  {codeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Find Business'
                  )}
                </Button>
              </form>
            </div>
          )}
          
          {connectionMethod === 'search' && (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setConnectionMethod(null);
                  setSearchResults([]);
                  setSearchQuery('');
                  setSelectedIndustry('all');
                  setHasSearched(false);
                }}
                className="mb-2"
              >
                ← Back
              </Button>
              
              <div className="space-y-3">
                <label className="text-sm font-medium">Search for a Business</label>
                
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, location, or service type..."
                    className="pl-10"
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
                
                {/* Industry Filter Pills */}
                {industries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedIndustry('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedIndustry === 'all'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      All
                    </button>
                    {industries.map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setSelectedIndustry(ind)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          selectedIndustry === ind
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  <p className="text-xs text-muted-foreground">
                    {searchResults.length} business{searchResults.length !== 1 ? 'es' : ''} found
                  </p>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => selectShop(result)}
                      className="w-full p-4 text-left border rounded-lg hover:bg-muted hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground group-hover:text-primary">
                            {result.name}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {result.industry && (
                              <Badge variant="secondary" className="text-xs">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {result.industry}
                              </Badge>
                            )}
                            {result.city && result.state && (
                              <span className="text-xs text-muted-foreground flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {result.city}, {result.state}
                              </span>
                            )}
                          </div>
                          
                          {result.shop_description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {result.shop_description}
                            </p>
                          )}
                        </div>
                        
                        {result.logo_url && (
                          <img 
                            src={result.logo_url} 
                            alt="" 
                            className="w-12 h-12 rounded-lg object-contain flex-shrink-0"
                          />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* No Results Message */}
              {hasSearched && searchResults.length === 0 && !searchLoading && (
                <div className="text-center py-6">
                  <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    No businesses found matching your search.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try a different name, location, or service type.
                  </p>
                </div>
              )}
              
              {/* Initial State - No Search Yet */}
              {!hasSearched && !searchLoading && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Start typing to search all registered businesses
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="text-center pt-4">
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </CustomerPortalLayout>
  );
}
