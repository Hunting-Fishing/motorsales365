
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useServiceSectors } from '@/hooks/useServiceCategories';
import { Loader2, Building, TreePine } from 'lucide-react';

export function ServiceSectorsList() {
  const { sectors, loading, error } = useServiceSectors();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Sectors Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Sectors Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm">Error loading service sectors: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const totalCategories = sectors.reduce((acc, sector) => acc + sector.categories.length, 0);
  const totalServices = sectors.reduce((acc, sector) => 
    acc + sector.categories.reduce((catAcc, category) => 
      catAcc + category.subcategories.reduce((subAcc, subcategory) => 
        subAcc + subcategory.jobs.length, 0), 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TreePine className="h-5 w-5" />
            <span>Service Hierarchy Overview</span>
          </CardTitle>
          <Badge variant="outline">{sectors.length} sectors</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Building className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-800">{sectors.length}</div>
            <div className="text-sm text-blue-600">Service Sectors</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Building className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-800">{totalCategories}</div>
            <div className="text-sm text-green-600">Categories</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Building className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-800">{totalServices}</div>
            <div className="text-sm text-purple-600">Total Services</div>
          </div>
        </div>
        
        {sectors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No service sectors found</p>
            <p className="text-sm">Import services to populate the hierarchy</p>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-600">
            <p>Use the detailed hierarchy view below to explore and manage your service structure.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
