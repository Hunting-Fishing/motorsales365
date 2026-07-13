
import { z } from "zod";

// Define schema for vehicle data
export interface VehicleFormData {
  id?: string;
  make: string;
  model: string;
  year: string;
  vin?: string;
  license_plate?: string;
  trim?: string;
  equipment_type?: string;
  
  // Additional vehicle details
  transmission?: string;
  drive_type?: string; 
  fuel_type?: string;
  engine?: string;
  body_style?: string;
  country?: string;
  transmission_type?: string;
  gvwr?: string;
  color?: string;
  
  // Decoded VIN fields (temporary storage)
  decoded_make?: string;
  decoded_model?: string;
  decoded_year?: string;
  decoded_transmission?: string;
  decoded_fuel_type?: string;
  decoded_engine?: string;
  decoded_body_style?: string;
  decoded_country?: string;
  decoded_trim?: string;
  decoded_gvwr?: string;
}

// Default empty vehicle
export const emptyVehicle: VehicleFormData = {
  make: '',
  model: '',
  year: '',
  vin: '',
  license_plate: '',
  trim: '',
  equipment_type: 'vehicle',
  transmission: '',
  drive_type: '',
  fuel_type: '',
  engine: '',
  body_style: '',
  country: '',
  transmission_type: '',
  gvwr: '',
  color: ''
};

// Add the vehicleSchema export using Zod - make year required with min length
export const vehicleSchema = z.object({
  id: z.string().optional(),
  make: z.string().min(1, "Make is required").refine((val) => {
    // Allow any value if it's a VIN-decoded value or if makes aren't loaded yet
    return val && val.length > 0;
  }, "Make is required"),
  model: z.string().min(1, "Model is required").refine((val) => {
    // Allow any value if it's a VIN-decoded value or if models aren't loaded yet
    return val && val.length > 0;
  }, "Model is required"),
  year: z.string().min(1, "Year is required"),
  vin: z.string().optional().or(z.literal("")),
  license_plate: z.string().optional().or(z.literal("")),
  trim: z.string().optional().or(z.literal("")),
  equipment_type: z.string().optional().or(z.literal("")),
  transmission: z.string().optional().or(z.literal("")),
  drive_type: z.string().optional().or(z.literal("")),
  fuel_type: z.string().optional().or(z.literal("")),
  engine: z.string().optional().or(z.literal("")),
  body_style: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  transmission_type: z.string().optional().or(z.literal("")),
  gvwr: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  
  // Decoded VIN fields
  decoded_make: z.string().optional().or(z.literal("")),
  decoded_model: z.string().optional().or(z.literal("")),
  decoded_year: z.string().optional().or(z.literal("")),
  decoded_transmission: z.string().optional().or(z.literal("")),
  decoded_fuel_type: z.string().optional().or(z.literal("")),
  decoded_engine: z.string().optional().or(z.literal("")),
  decoded_body_style: z.string().optional().or(z.literal("")),
  decoded_country: z.string().optional().or(z.literal("")),
  decoded_trim: z.string().optional().or(z.literal("")),
  decoded_gvwr: z.string().optional().or(z.literal(""))
});
