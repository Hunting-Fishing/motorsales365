
import { VehicleService } from '@/lib/services/VehicleService';
import { Vehicle, CreateVehicleInput, UpdateVehicleInput } from '@/lib/database/repositories/VehicleRepository';

const vehicleService = new VehicleService();

/**
 * Get vehicle by ID using real database
 */
export const getVehicleById = async (vehicleId: string): Promise<Vehicle | null> => {
  try {
    console.log('Fetching vehicle with ID:', vehicleId);
    return await vehicleService.getVehicleById(vehicleId);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    throw error;
  }
};

/**
 * Get vehicles by customer ID using real database
 */
export const getCustomerVehicles = async (customerId: string): Promise<Vehicle[]> => {
  try {
    console.log('Fetching vehicles for customer ID:', customerId);
    return await vehicleService.getCustomerVehicles(customerId);
  } catch (error) {
    console.error('Error fetching customer vehicles:', error);
    throw error;
  }
};

/**
 * Create a new vehicle in the database
 */
export const createVehicle = async (vehicleData: CreateVehicleInput): Promise<Vehicle> => {
  try {
    return await vehicleService.createVehicle(vehicleData);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

/**
 * Update vehicle in the database
 */
export const updateVehicle = async (vehicleId: string, updates: UpdateVehicleInput): Promise<Vehicle> => {
  try {
    return await vehicleService.updateVehicle(vehicleId, updates);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

/**
 * Delete vehicle from the database
 */
export const deleteVehicle = async (vehicleId: string): Promise<void> => {
  try {
    await vehicleService.deleteVehicle(vehicleId);
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

/**
 * Search vehicles by various criteria
 */
export const searchVehicles = async (searchTerm: string): Promise<Vehicle[]> => {
  try {
    return await vehicleService.searchVehicles(searchTerm);
  } catch (error) {
    console.error('Error searching vehicles:', error);
    throw error;
  }
};

/**
 * Get vehicle by VIN using real database
 */
export const getVehicleByVin = async (vin: string): Promise<Vehicle | null> => {
  try {
    return await vehicleService.getVehicleByVin(vin);
  } catch (error) {
    console.error('Error fetching vehicle by VIN:', error);
    throw error;
  }
};
