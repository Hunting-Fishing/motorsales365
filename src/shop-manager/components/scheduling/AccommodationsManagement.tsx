import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useScheduling } from '@/hooks/useScheduling';

export function AccommodationsManagement() {
  const { accommodations, loading } = useScheduling();

  const getAccommodationTypeColor = (type: string) => {
    const colors = {
      medical: 'bg-red-100 text-red-800',
      religious: 'bg-purple-100 text-purple-800',
      personal: 'bg-blue-100 text-blue-800',
      disability: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Employee Accommodations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading accommodations...</div>
          ) : accommodations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active accommodations
            </div>
          ) : (
            <div className="space-y-3">
              {accommodations.map(accommodation => (
                <div
                  key={accommodation.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge className={getAccommodationTypeColor(accommodation.accommodation_type)}>
                        {accommodation.accommodation_type}
                      </Badge>
                      {accommodation.is_permanent && (
                        <Badge variant="outline" className="ml-2">
                          Permanent
                        </Badge>
                      )}
                    </div>
                    <Badge variant={accommodation.status === 'active' ? 'default' : 'secondary'}>
                      {accommodation.status}
                    </Badge>
                  </div>

                  <div className="text-sm">
                    {accommodation.description}
                  </div>

                  {!accommodation.is_permanent && accommodation.start_date && (
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(accommodation.start_date), 'MMM d, yyyy')}
                      {accommodation.end_date && (
                        <> - {format(new Date(accommodation.end_date), 'MMM d, yyyy')}</>
                      )}
                    </div>
                  )}

                  {accommodation.notes && (
                    <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                      <strong>Notes:</strong> {accommodation.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
