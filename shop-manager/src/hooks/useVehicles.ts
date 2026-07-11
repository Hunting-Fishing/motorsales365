
import { useState, useEffect, useCallback } from 'react';
import { VehicleService } from '@/lib/services/VehicleService';
import { Vehicle, CreateVehicleInput, UpdateVehicleInput } from '@/lib/database/repositories/VehicleRepository';

const vehicleService = new VehicleService();

export function useVehicles(customerId?: string) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    if (!customerId) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await vehicleService.getCustomerVehicles(customerId);
      setVehicles(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch vehicles';
      setError(errorMessage);
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const createVehicle = useCallback(async (vehicleData: CreateVehicleInput) => {
    try {
      const newVehicle = await vehicleService.createVehicle(vehicleData);
      setVehicles(prev => [newVehicle, ...prev]);
      return newVehicle;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vehicle';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateVehicle = useCallback(async (id: string, updates: UpdateVehicleInput) => {
    try {
      const updatedVehicle = await vehicleService.updateVehicle(id, updates);
      setVehicles(prev => prev.map(v => v.id === id ? updatedVehicle : v));
      return updatedVehicle;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update vehicle';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    try {
      await vehicleService.deleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete vehicle';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const searchVehicles = useCallback(async (searchTerm: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await vehicleService.searchVehicles(searchTerm);
      setVehicles(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search vehicles';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return {
    vehicles,
    loading,
    error,
    refetch: fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    searchVehicles
  };
}
