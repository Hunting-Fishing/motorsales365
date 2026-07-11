
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wrench } from 'lucide-react';

interface ServiceRecord {
  id: string;
  date: string;
  description: string;
  service_type: string;
  technician_name: string;
  cost: number;
}

export const VehicleServiceHistory: React.FC<{ vehicleId: string }> = ({ vehicleId }) => {
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServiceHistory = async () => {
      try {
        // In a real app, fetch work orders related to this vehicle from your database
        // For now, we'll just simulate this with work_orders data
        const { data, error } = await supabase
          .from('work_orders')
          .select('*')
          .eq('vehicle_id', vehicleId);
          
        if (error) throw error;
        
        // Transform work orders to service records
        const records = (data || []).map(wo => ({
          id: wo.id,
          date: wo.created_at,
          description: wo.description || 'Service visit',
          service_type: 'Maintenance',
          technician_name: 'Technician',
          cost: wo.total_cost || 0
        }));
        
        setServiceHistory(records);
      } catch (error) {
        console.error("Error fetching service history:", error);
        setServiceHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceHistory();
  }, [vehicleId]);

  if (loading) {
    return <div className="p-4 text-center">Loading service history...</div>;
  }

  if (serviceHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Wrench className="w-16 h-16 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Service History Found</h3>
        <p className="text-muted-foreground">No service records have been found for this vehicle.</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Technician</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {serviceHistory.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
              <TableCell>{record.description}</TableCell>
              <TableCell>{record.technician_name}</TableCell>
              <TableCell className="text-right">${record.cost.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
