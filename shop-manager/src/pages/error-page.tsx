
import { useRouteError, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, Phone, Mail } from "lucide-react";
import { CompanyContactEnhanced } from "@/components/common/CompanyContactEnhanced";
import { useCompany } from "@/contexts/CompanyContext";

export default function ErrorPage() {
  const error = useRouteError() as any;
  const { companyName } = useCompany();
  
  console.error(error);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl">Oops! Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            {error?.statusText || error?.message || "Sorry, an unexpected error has occurred."}
          </p>
          
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
            
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Need help? Contact {companyName} support:
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
  );
}
