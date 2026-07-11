
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare } from 'lucide-react';
import { getVehicleInteractions } from '@/services/customer/customerInteractionsService';
import { CustomerInteraction } from '@/types/interaction';

export const VehicleInteractions: React.FC<{ vehicleId: string }> = ({ vehicleId }) => {
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicleInteractions = async () => {
      try {
        setLoading(true);
        const data = await getVehicleInteractions(vehicleId);
        setInteractions(data);
      } catch (error) {
        console.error('Error in fetchVehicleInteractions:', error);
        setInteractions([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVehicleInteractions();
  }, [vehicleId]);

  if (loading) {
    return <div className="p-4 text-center">Loading interactions...</div>;
  }

  if (interactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="w-16 h-16 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Interactions Found</h3>
        <p className="text-muted-foreground">There are no interactions recorded for this vehicle.</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interactions.map((interaction) => (
            <TableRow key={interaction.id}>
              <TableCell>{new Date(interaction.date).toLocaleDateString()}</TableCell>
              <TableCell>{interaction.type}</TableCell>
              <TableCell>{interaction.staff_member_name}</TableCell>
              <TableCell>{interaction.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
