
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, User, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { CompanyContactEnhanced } from "@/components/common/CompanyContactEnhanced";
import { useCompany } from "@/contexts/CompanyContext";

export function CustomerLoginRequired() {
  const { companyName } = useCompany();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md shadow-lg border-blue-100 bg-gradient-to-br from-white to-blue-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-blue-100 mb-4">
              <Lock className="h-8 w-8 text-blue-700" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in to access your {companyName} customer portal.
              Sign in or create an account to view your vehicle records, 
              service history, and schedule appointments.
            </p>
            
            <div className="space-y-4 w-full max-w-xs">
              <Link to="/login">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2">
                  <LogIn className="h-5 w-5" />
                  Sign In
                </Button>
              </Link>
              
              <div className="text-sm text-gray-500">
                Don't have an account yet?
              </div>
              
              <Link to="/login">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <User className="h-5 w-5" />
                  Create Account
                </Button>
              </Link>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 w-full">
              <p className="text-sm text-gray-500 mb-3">Need assistance?</p>
              <CompanyContactEnhanced
                variant="inline"
                showAddress={false}
                showBusinessHours={true}
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
