
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Shield, Clock, AlertCircle } from 'lucide-react';

export function PartsWarrantyTracking() {
  // This would need to fetch parts with warranty information from the database
  const { data: partsWithWarranty = [] } = useQuery({
    queryKey: ['parts-warranty-tracking'],
    queryFn: async () => {
      // In a real implementation, this would fetch parts with warranty data
      // For now, return empty array to avoid mock data
      return [];
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Parts Warranty Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {partsWithWarranty.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No warranty data available</p>
              <p className="text-sm">Parts with warranty information will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {partsWithWarranty.map((part: any) => (
                <div key={part.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{part.name}</h3>
                      <p className="text-sm text-muted-foreground">Part #: {part.part_number}</p>
                    </div>
                    <Badge variant="outline">{part.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Install Date
                      </p>
                      <p className="font-medium">{part.installDate || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Warranty Duration</p>
                      <p className="font-medium">{part.warrantyDuration || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Expires
                      </p>
                      <p className="font-medium">{part.warrantyExpiryDate || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Value</p>
                      <p className="font-medium">${(part.retailPrice || part.total_price || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
