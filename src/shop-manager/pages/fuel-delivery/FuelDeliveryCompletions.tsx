import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Droplets, ArrowLeft, CheckCircle } from 'lucide-react';
import { useFuelDeliveryCompletions } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';

export default function FuelDeliveryCompletions() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: completions, isLoading } = useFuelDeliveryCompletions();
  const { formatVolume, getVolumeLabel } = useFuelUnits();

  const filteredCompletions = completions?.filter(completion =>
    completion.fuel_delivery_orders?.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    completion.fuel_delivery_orders?.fuel_delivery_customers?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/fuel-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Droplets className="h-8 w-8 text-cyan-600" />
              Completed Deliveries
            </h1>
            <p className="text-muted-foreground mt-1">
              View delivery history and completion details
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deliveries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Completions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCompletions && filteredCompletions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>{getVolumeLabel(false)}</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompletions.map((completion) => (
                  <TableRow key={completion.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {completion.fuel_delivery_orders?.order_number || '-'}
                    </TableCell>
                    <TableCell>
                      {completion.fuel_delivery_orders?.fuel_delivery_customers?.company_name || '-'}
                    </TableCell>
                    <TableCell>
                      {completion.fuel_delivery_drivers 
                        ? `${completion.fuel_delivery_drivers.first_name} ${completion.fuel_delivery_drivers.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell>{completion.fuel_delivery_trucks?.truck_number || '-'}</TableCell>
                    <TableCell>{format(new Date(completion.delivery_date), 'MMM d, yyyy h:mm a')}</TableCell>
                    <TableCell className="font-medium">{formatVolume(completion.gallons_delivered || 0)}</TableCell>
                    <TableCell className="font-medium">${completion.total_amount?.toLocaleString() || '0'}</TableCell>
                    <TableCell>
                      {completion.payment_received ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Received
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Droplets className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No completed deliveries found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
