import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, UserPlus, LogIn, MapPin, Phone, ArrowLeft } from 'lucide-react';
import { getShopBySlug, ShopPublicInfo } from '@/services/shopLookupService';

export default function BusinessLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopPublicInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadShop = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      
      const shopData = await getShopBySlug(slug);
      if (shopData) {
        setShop(shopData);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };
    
    loadShop();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (notFound || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
        <Card className="w-full max-w-md shadow-xl border-amber-200">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-amber-900">Business Not Found</CardTitle>
            <CardDescription>
              We couldn't find a business with this link. It may have been moved or removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/customer-portal')}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Go to Customer Portal
            </Button>
            <div className="text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-amber-600">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-amber-200">
        <CardHeader className="text-center space-y-4">
          {shop.logo_url ? (
            <img 
              src={shop.logo_url} 
              alt={shop.name} 
              className="w-24 h-24 mx-auto object-contain rounded-lg"
            />
          ) : (
            <div className="mx-auto w-24 h-24 bg-amber-600 rounded-full flex items-center justify-center">
              <Building2 className="h-12 w-12 text-white" />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl font-bold text-amber-900">
              {shop.name}
            </CardTitle>
            <CardDescription className="text-amber-700 mt-2">
              Welcome to our Customer Portal
            </CardDescription>
          </div>
          
          {/* Contact Info */}
          <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
            {shop.city && shop.state && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{shop.city}, {shop.state}</span>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <a href={`tel:${shop.phone}`} className="hover:text-amber-600">
                  {shop.phone}
                </a>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <p className="text-sm text-amber-800">
              Create an account to book services, view your service history, and manage your account with us.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate(`/customer-portal/register?shop=${shop.slug}`)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              size="lg"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Create Account
            </Button>
            
            <Button 
              onClick={() => navigate(`/customer-portal/login?shop=${shop.slug}`)}
              variant="outline"
              className="w-full border-amber-300 hover:bg-amber-50"
              size="lg"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Sign In
            </Button>
          </div>
          
          <div className="pt-4 border-t text-center">
            <Link 
              to="/customer-portal" 
              className="text-sm text-muted-foreground hover:text-amber-600 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Looking for a different business?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
