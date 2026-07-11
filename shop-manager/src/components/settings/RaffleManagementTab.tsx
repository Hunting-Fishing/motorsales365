import React, { useState } from 'react';
import { RaffleDashboard } from '@/components/raffle/RaffleDashboard';
import { RaffleForm } from '@/components/raffle/RaffleForm';
import { TicketSalesManager } from '@/components/raffle/TicketSalesManager';
import { RaffleService } from '@/services/raffleService';
import { Raffle, CreateRaffleData, UpdateRaffleData } from '@/types/raffle';
import { useToast } from '@/hooks/use-toast';

export function RaffleManagementTab() {
  const { toast } = useToast();
  const [view, setView] = useState<'dashboard' | 'form' | 'tickets'>('dashboard');
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);

  const handleCreateRaffle = async (data: CreateRaffleData) => {
    try {
      await RaffleService.createRaffle(data);
      toast({
        title: 'Success',
        description: 'Raffle created successfully',
      });
      setView('dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create raffle',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRaffle = async (data: UpdateRaffleData) => {
    if (!selectedRaffle) return;
    try {
      await RaffleService.updateRaffle(selectedRaffle.id, data);
      toast({
        title: 'Success',
        description: 'Raffle updated successfully',
      });
      setView('dashboard');
      setSelectedRaffle(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update raffle',
        variant: 'destructive',
      });
    }
  };

  if (view === 'form') {
    return (
      <RaffleForm
        raffle={selectedRaffle || undefined}
        onSubmit={selectedRaffle ? handleUpdateRaffle : handleCreateRaffle}
        onCancel={() => {
          setView('dashboard');
          setSelectedRaffle(null);
        }}
      />
    );
  }

  if (view === 'tickets' && selectedRaffle) {
    return (
      <TicketSalesManager
        raffle={selectedRaffle}
        onClose={() => {
          setView('dashboard');
          setSelectedRaffle(null);
        }}
      />
    );
  }

  return (
    <RaffleDashboard
      onCreateRaffle={() => {
        setSelectedRaffle(null);
        setView('form');
      }}
      onEditRaffle={(raffle) => {
        setSelectedRaffle(raffle);
        setView('form');
      }}
      onViewTickets={(raffle) => {
        setSelectedRaffle(raffle);
        setView('tickets');
      }}
    />
  );
}