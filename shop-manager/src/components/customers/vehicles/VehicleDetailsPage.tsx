
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Car, PenLine, HistoryIcon, FileClock } from 'lucide-react';
import { getVehicleById } from '@/utils/vehicleUtils';
import { VehicleDetailCard } from './VehicleDetailCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function VehicleDetailsPage() {
  const { customerId, vehicleId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicleData = async () => {
      if (!vehicleId) {
        setError('Vehicle ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getVehicleById(vehicleId);
        setVehicle(data);
      } catch (err) {
        console.error('Error fetching vehicle:', err);
        setError('Failed to load vehicle information');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, [vehicleId]);

  const handleBackClick = () => {
    navigate(`/customers/${customerId}`);
  };

  const handleEditClick = () => {
    navigate(`/customers/${customerId}/edit?tab=vehicles`);
  };

  return (
    <div className="container py-6">
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackClick}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customer
        </Button>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Vehicle Details</h1>
          <Button onClick={handleEditClick}>
            <PenLine className="mr-2 h-4 w-4" />
            Edit Vehicle
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <VehicleDetailCard vehicle={vehicle} className="mb-6" />

          <Tabs defaultValue="workOrders" className="w-full">
            <TabsList>
              <TabsTrigger value="workOrders">
                <FileClock className="mr-2 h-4 w-4" />
                Work Orders
              </TabsTrigger>
              <TabsTrigger value="serviceHistory">
                <HistoryIcon className="mr-2 h-4 w-4" />
                Service History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="workOrders">
              <Card>
                <CardHeader>
                  <CardTitle>Work Orders</CardTitle>
                  <CardDescription>
                    All work orders related to this vehicle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    No work orders found for this vehicle
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => navigate(`/work-orders/new?vehicleId=${vehicleId}&vehicleInfo=${vehicle.year} ${vehicle.make} ${vehicle.model}&customerId=${customerId}`)}>
                    Create New Work Order
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="serviceHistory">
              <Card>
                <CardHeader>
                  <CardTitle>Service History</CardTitle>
                  <CardDescription>
                    Service history for this vehicle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    No service history records found
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
