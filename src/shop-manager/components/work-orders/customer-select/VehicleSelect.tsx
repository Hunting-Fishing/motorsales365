
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Car } from "lucide-react";
import { CustomerVehicle } from "@/types/customer";

interface VehicleSelectProps {
  customerId: string | null;
  onSelectVehicle: (vehicle: CustomerVehicle | null, vehiclesList?: CustomerVehicle[]) => void;
  selectedVehicleId?: string | null;
}

export function VehicleSelect({ customerId, onSelectVehicle, selectedVehicleId }: VehicleSelectProps) {
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch vehicles when customer changes
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!customerId) {
        setVehicles([]);
        onSelectVehicle(null, []);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .eq("customer_id", customerId);

        if (error) throw error;
        setVehicles(data || []);
        
        // Pass vehicles list to parent component
        onSelectVehicle(null, data || []);
        
        // If there was a previously selected vehicle, try to find it in the new list
        if (selectedVehicleId && data) {
          const selected = data.find(v => v.id === selectedVehicleId);
          if (selected) {
            onSelectVehicle(selected, data);
          } else if (data.length > 0) {
            // Default to first vehicle if previous selection not found
            onSelectVehicle(data[0], data);
          } else {
            onSelectVehicle(null, data);
          }
        } else if (data && data.length > 0) {
          // Default select first vehicle
          onSelectVehicle(data[0], data);
        } else {
          onSelectVehicle(null, data || []);
        }
      } catch (error) {
        console.error("Error fetching vehicles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [customerId, selectedVehicleId]);

  // Format vehicle display
  const getVehicleDisplay = (vehicle: CustomerVehicle) => {
    const year = vehicle.year ? `${vehicle.year} ` : '';
    const make = vehicle.make ? `${vehicle.make} ` : '';
    const model = vehicle.model || '';
    const plate = vehicle.license_plate ? ` (${vehicle.license_plate})` : '';
    
    return `${year}${make}${model}${plate}`;
  };

  if (!customerId) {
    return (
      <Select disabled>
        <SelectTrigger className="bg-white dark:bg-slate-800">
          <SelectValue placeholder="Select a customer first" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      disabled={loading || vehicles.length === 0}
      value={selectedVehicleId || ""}
      onValueChange={(value) => {
        const vehicle = vehicles.find(v => v.id === value);
        onSelectVehicle(vehicle || null, vehicles);
      }}
    >
      <SelectTrigger className="bg-white dark:bg-slate-800">
        {loading ? (
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>Loading vehicles...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <span className="text-slate-500">No vehicles found</span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        {vehicles.map((vehicle) => (
          <SelectItem key={vehicle.id} value={vehicle.id || ""}>
            <div className="flex items-center">
              <Car className="h-4 w-4 mr-2" />
              <span>{getVehicleDisplay(vehicle)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
