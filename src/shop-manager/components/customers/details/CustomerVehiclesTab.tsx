
import React from 'react';
import { Customer } from '@/types/customer';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Car, Pencil, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface CustomerVehiclesTabProps {
  customer: Customer;
}

export function CustomerVehiclesTab({ customer }: CustomerVehiclesTabProps) {
  const navigate = useNavigate();
  const vehicles = customer?.vehicles || [];

  console.log('CustomerVehiclesTab - customer:', customer);
  console.log('CustomerVehiclesTab - vehicles:', vehicles);

  const handleAddVehicle = () => {
    navigate(`/customers/${customer.id}/edit?tab=vehicles`);
  };

  const handleEditCustomer = () => {
    navigate(`/customers/${customer.id}/edit?tab=vehicles`);
  };

  const handleVehicleClick = (vehicleId: string) => {
    navigate(`/customers/${customer.id}/vehicles/${vehicleId}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Car className="w-16 h-16 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Vehicles Found</h3>
        <p className="text-muted-foreground mb-6">This customer doesn't have any vehicles registered yet.</p>
        <Button onClick={handleAddVehicle}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Customer Vehicles</h3>
          <p className="text-sm text-muted-foreground">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddVehicle}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
          <Button variant="outline" onClick={handleEditCustomer}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Vehicles
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>VIN</TableHead>
              <TableHead>License Plate</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Last Service</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle, index) => (
              <TableRow 
                key={vehicle.id || `vehicle-${index}`} 
                className="hover:bg-muted/50"
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {vehicle.year || 'N/A'} {vehicle.make || 'Unknown'} {vehicle.model || 'Unknown'}
                    </span>
                    {vehicle.trim && (
                      <span className="text-sm text-muted-foreground">{vehicle.trim}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {vehicle.vin ? (
                    <span className="bg-muted px-2 py-1 rounded">{vehicle.vin}</span>
                  ) : (
                    <span className="text-muted-foreground">No VIN</span>
                  )}
                </TableCell>
                <TableCell>
                  {vehicle.license_plate ? (
                    <Badge variant="outline" className="font-mono">
                      {vehicle.license_plate}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell>
                  {vehicle.color ? (
                    <Badge variant="secondary">{vehicle.color}</Badge>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  {vehicle.last_service_date ? (
                    formatDate(vehicle.last_service_date)
                  ) : (
                    <span className="text-muted-foreground">No service history</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => vehicle.id ? handleVehicleClick(vehicle.id) : null}
                      disabled={!vehicle.id}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleEditCustomer}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {vehicles.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <p>💡 Click the eye icon to view detailed vehicle information and service history.</p>
        </div>
      )}
    </div>
  );
}
