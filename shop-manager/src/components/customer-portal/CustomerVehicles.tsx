
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Calendar, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export function CustomerVehicles() {
  const { userId } = useAuthUser();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVehicles() {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('customer_id', userId);

        if (error) {
          console.error('Error fetching vehicles:', error);
        } else {
          setVehicles(data || []);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchVehicles();
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Vehicles</CardTitle>
        <CardDescription>Manage your vehicles and service history</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading vehicles...</p>
        ) : vehicles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border rounded-md p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  {vehicle.color && (
                    <Badge variant="secondary">{vehicle.color}</Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <Car className="mr-2 inline-block h-4 w-4" />
                    {vehicle.vin}
                  </p>
                  <p className="text-sm">
                    <Calendar className="mr-2 inline-block h-4 w-4" />
                    Last service: {vehicle.last_service_date || 'N/A'}
                  </p>
                </div>
                <div className="mt-4">
                  <Button variant="outline">
                    <Wrench className="mr-2 h-4 w-4" />
                    View Service History
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No vehicles found.</p>
        )}
      </CardContent>
    </Card>
  );
}
