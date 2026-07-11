
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, Home, LogIn } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useShopName } from "@/hooks/useShopName";
import { CompanyContactEnhanced } from "@/components/common/CompanyContactEnhanced";
import { useCompany } from "@/contexts/CompanyContext";

export default function Unauthorized() {
  const { shopName } = useShopName();
  const { companyName } = useCompany();

  return (
    <>
      <Helmet>
        <title>{`Unauthorized | ${shopName || "All Business 365"}`}</title>
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100">
                <ShieldX className="h-8 w-8 text-red-700" />
              </div>
            </div>
            <CardTitle className="text-xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>
            
            <div className="space-y-4 w-full max-w-xs mx-auto">
              <Link to="/">
                <Button className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </Link>
              
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In with Different Account
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Need help with access? Contact {companyName}:
              </p>
              <CompanyContactEnhanced
                variant="inline"
                showAddress={false}
                showBusinessHours={false}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
