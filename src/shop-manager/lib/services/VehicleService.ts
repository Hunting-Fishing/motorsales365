
import { VehicleRepository, Vehicle, CreateVehicleInput, UpdateVehicleInput } from '@/lib/database/repositories/VehicleRepository';

export class VehicleService {
  private repository: VehicleRepository;

  constructor() {
    this.repository = new VehicleRepository();
  }

  async getCustomerVehicles(customerId: string): Promise<Vehicle[]> {
    try {
      return await this.repository.findByCustomer(customerId);
    } catch (error) {
      console.error('Error fetching customer vehicles:', error);
      throw new Error('Failed to fetch customer vehicles');
    }
  }

  async createVehicle(vehicleData: CreateVehicleInput): Promise<Vehicle> {
    try {
      // Validate required fields based on owner type
      if (vehicleData.owner_type === 'customer' && !vehicleData.customer_id) {
        throw new Error('Customer ID is required for customer vehicles');
      }

      // Check for duplicate VIN if provided
      if (vehicleData.vin) {
        const existingVehicle = await this.repository.findByVin(vehicleData.vin);
        if (existingVehicle) {
          throw new Error('Vehicle with this VIN already exists');
        }
      }

      return await this.repository.create(vehicleData);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create vehicle');
    }
  }

  async getCompanyAssets(): Promise<Vehicle[]> {
    try {
      return await this.repository.findCompanyAssets();
    } catch (error) {
      console.error('Error fetching company assets:', error);
      throw new Error('Failed to fetch company assets');
    }
  }

  async updateVehicle(id: string, updates: UpdateVehicleInput): Promise<Vehicle> {
    try {
      // Check for duplicate VIN if updating VIN
      if (updates.vin) {
        const existingVehicle = await this.repository.findByVin(updates.vin);
        if (existingVehicle && existingVehicle.id !== id) {
          throw new Error('Vehicle with this VIN already exists');
        }
      }

      return await this.repository.update(id, updates);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update vehicle');
    }
  }

  async deleteVehicle(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw new Error('Failed to delete vehicle');
    }
  }

  async searchVehicles(searchTerm: string): Promise<Vehicle[]> {
    try {
      if (!searchTerm.trim()) {
        return [];
      }
      return await this.repository.searchVehicles(searchTerm);
    } catch (error) {
      console.error('Error searching vehicles:', error);
      throw new Error('Failed to search vehicles');
    }
  }

  async getVehicleByVin(vin: string): Promise<Vehicle | null> {
    try {
      return await this.repository.findByVin(vin);
    } catch (error) {
      console.error('Error finding vehicle by VIN:', error);
      throw new Error('Failed to find vehicle by VIN');
    }
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      console.error('Error finding vehicle by ID:', error);
      throw new Error('Failed to find vehicle by ID');
    }
  }
}
