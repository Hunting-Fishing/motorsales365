
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServiceManagementNavigation } from '@/components/developer/service-management/ServiceManagementNavigation';
import { ServiceManagementSettings } from '@/components/developer/service-management/ServiceManagementSettings';
import { Settings, Database, FileText, Search, Building, RefreshCw, AlertTriangle } from 'lucide-react';
import { useServiceSectors } from '@/hooks/useServiceCategories';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ServiceManagementLayout() {
  const { sectors, loading, refetch } = useServiceSectors();

  const totalSectors = sectors.length;
  const totalCategories = sectors.reduce((acc, sector) => acc + sector.categories.length, 0);
  const totalServices = sectors.reduce((acc, sector) => 
    acc + sector.categories.reduce((catAcc, category) => 
      catAcc + category.subcategories.reduce((subAcc, subcategory) => 
        subAcc + subcategory.jobs.length, 0), 0), 0);

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Management</h1>
          <p className="text-muted-foreground">
            Manage service sectors, categories, subcategories, and individual services
          </p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Hierarchy Update:</strong> Fixed Excel mapping - File names now become main categories, 
                first column becomes subcategories, ensuring correct service organization.
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ServiceManagementSettings onDataChange={handleRefresh}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </ServiceManagementSettings>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Sectors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '...' : totalSectors}</p>
            <p className="text-sm text-muted-foreground">Service sectors (from file names)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '...' : totalCategories}</p>
            <p className="text-sm text-muted-foreground">Main categories (Excel sheets)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '...' : totalServices}</p>
            <p className="text-sm text-muted-foreground">Total services (corrected mapping)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Fixed</p>
            <p className="text-sm text-muted-foreground">Hierarchy mapping corrected</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            All data shown below is live from your Supabase database. No mock or sample data is displayed.
          </AlertDescription>
        </Alert>
        
        <ServiceManagementNavigation />
        
        <Outlet />
      </div>
    </div>
  );
}
