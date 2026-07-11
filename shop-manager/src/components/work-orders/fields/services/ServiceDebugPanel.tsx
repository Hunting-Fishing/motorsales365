
import React from 'react';
import { ServiceSector } from '@/types/service';
import { SelectedService } from '@/types/selectedService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Database, Users, FileText } from 'lucide-react';

interface ServiceDebugPanelProps {
  sectors: ServiceSector[];
  selectedServices: SelectedService[];
}

export function ServiceDebugPanel({
  sectors,
  selectedServices
}: ServiceDebugPanelProps) {
  const totalCategories = sectors.reduce((acc, sector) => acc + sector.categories.length, 0);
  const totalSubcategories = sectors.reduce((acc, sector) => 
    acc + sector.categories.reduce((catAcc, category) => 
      catAcc + category.subcategories.length, 0), 0);
  const totalServices = sectors.reduce((acc, sector) => 
    acc + sector.categories.reduce((catAcc, category) => 
      catAcc + category.subcategories.reduce((subAcc, subcategory) => 
        subAcc + subcategory.jobs.length, 0), 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-500" />
        <h4 className="text-sm font-medium text-slate-700">Service Debug Information</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Sectors:</span>
              <Badge variant="outline">{sectors.length}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Categories:</span>
              <Badge variant="outline">{totalCategories}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Subcategories:</span>
              <Badge variant="outline">{totalSubcategories}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Services:</span>
              <Badge variant="outline">{totalServices}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Selection State
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Selected Services:</span>
              <Badge variant="outline">{selectedServices.length}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Total Time (min):</span>
              <Badge variant="outline">
                {selectedServices.reduce((total, service) => total + (service.estimatedTime || 0), 0)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Total Cost:</span>
              <Badge variant="outline">
                ${selectedServices.reduce((total, service) => total + (service.price || 0), 0).toFixed(2)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sector Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Sector Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sectors.map((sector) => (
              <div key={sector.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{sector.name}</span>
                  <Badge variant="secondary">{sector.categories.length} categories</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <span>Subcategories: </span>
                    <span className="font-medium">
                      {sector.categories.reduce((acc, cat) => acc + cat.subcategories.length, 0)}
                    </span>
                  </div>
                  <div>
                    <span>Services: </span>
                    <span className="font-medium">
                      {sector.categories.reduce((acc, cat) => 
                        acc + cat.subcategories.reduce((subAcc, sub) => 
                          subAcc + sub.jobs.length, 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
