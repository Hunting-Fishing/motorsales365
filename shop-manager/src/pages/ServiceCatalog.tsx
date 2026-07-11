
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceSectors } from '@/hooks/useServiceCategories';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign } from 'lucide-react';

export default function ServiceCatalog() {
  const { sectors, loading, error } = useServiceSectors();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Catalog</h1>
          <p className="text-muted-foreground">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Catalog</h1>
          <p className="text-destructive">Error loading services: {error}</p>
        </div>
      </div>
    );
  }

  const allServices = sectors.flatMap(sector =>
    sector.categories.flatMap(category =>
      category.subcategories.flatMap(subcategory =>
        subcategory.jobs.map(job => ({
          ...job,
          categoryName: category.name,
          subcategoryName: subcategory.name
        }))
      )
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Service Catalog</h1>
        <p className="text-muted-foreground">
          Browse and manage your automotive services
        </p>
      </div>

      {allServices.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No services available. Import services to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allServices.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {service.description || 'Professional service'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {service.categoryName}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {service.subcategoryName}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {service.price && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xl font-bold">${service.price}</span>
                      </div>
                    )}
                    {service.estimatedTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {service.estimatedTime} min
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
