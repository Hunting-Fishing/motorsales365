import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ServiceMainCategory } from '@/types/service';
import { ChevronDown, Info, AlertTriangle, CheckCircle, Database } from 'lucide-react';

interface ServiceDebugInfoProps {
  categories: ServiceMainCategory[];
}

export function ServiceDebugInfo({ categories }: ServiceDebugInfoProps) {
  const totalSubcategories = categories.reduce((acc, category) => acc + category.subcategories.length, 0);
  const totalServices = categories.reduce((acc, category) => 
    acc + category.subcategories.reduce((subAcc, subcategory) => 
      subAcc + subcategory.jobs.length, 0), 0);

  const categoriesWithDescriptions = categories.filter(cat => cat.description);
  const subcategoriesWithDescriptions = categories.flatMap(cat => cat.subcategories.filter(sub => sub.description));
  const servicesWithDescriptions = categories.flatMap(cat => 
    cat.subcategories.flatMap(sub => sub.jobs.filter(job => job.description)));

  const categoriesWithoutPositions = categories.filter(cat => !cat.position);
  const subcategoriesWithoutCategoryIds = categories.flatMap(cat => cat.subcategories.filter(sub => !sub.category_id));
  const servicesWithoutSubcategoryIds = categories.flatMap(cat => 
    cat.subcategories.flatMap(sub => sub.jobs.filter(job => !job.subcategory_id)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            Data Overview
          </CardTitle>
          <Badge variant="secondary">{categories.length} Categories</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-gray-600 flex justify-between">
            <span>Subcategories:</span>
            <span>{totalSubcategories}</span>
          </div>
          <div className="text-xs text-gray-600 flex justify-between">
            <span>Services:</span>
            <span>{totalServices}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Quality Checks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categoriesWithDescriptions.length > 0 && (
            <Alert variant="warning">
              <AlertDescription className="text-xs">
                <span className="font-medium">{categoriesWithDescriptions.length}</span> categories with descriptions
              </AlertDescription>
            </Alert>
          )}

          {subcategoriesWithDescriptions.length > 0 && (
            <Alert variant="warning">
              <AlertDescription className="text-xs">
                <span className="font-medium">{subcategoriesWithDescriptions.length}</span> subcategories with descriptions
              </AlertDescription>
            </Alert>
          )}

          {servicesWithDescriptions.length > 0 && (
            <Alert variant="warning">
              <AlertDescription className="text-xs">
                <span className="font-medium">{servicesWithDescriptions.length}</span> services with descriptions
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-500" />
            Data Integrity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categoriesWithoutPositions.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                <span className="font-medium">{categoriesWithoutPositions.length}</span> categories without positions
              </AlertDescription>
            </Alert>
          )}

          {subcategoriesWithoutCategoryIds.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                <span className="font-medium">{subcategoriesWithoutCategoryIds.length}</span> subcategories without category IDs
              </AlertDescription>
            </Alert>
          )}

          {servicesWithoutSubcategoryIds.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                <span className="font-medium">{servicesWithoutSubcategoryIds.length}</span> services without subcategory IDs
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
