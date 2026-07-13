
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Search } from "lucide-react";
import { CompanyContactEnhanced } from "@/components/common/CompanyContactEnhanced";
import { useCompany } from "@/contexts/CompanyContext";

const NotFound = () => {
  const location = useLocation();
  const { companyName } = useCompany();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-blue-100">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-6xl font-bold text-esm-blue-600 mb-2">404</CardTitle>
          <CardTitle className="text-xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            We couldn't find the page you were looking for. Please check the URL or navigate back to the dashboard.
          </p>
          
          <div className="space-y-3">
            <Button asChild className="w-full bg-esm-blue-600 hover:bg-esm-blue-700">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
            
            <Button variant="outline" onClick={() => window.history.back()} className="w-full">
              Go Back
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Need help navigating {companyName}?
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
};

export default NotFound;
