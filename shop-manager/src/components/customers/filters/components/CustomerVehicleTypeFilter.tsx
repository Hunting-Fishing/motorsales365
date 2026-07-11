
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomerVehicleTypeFilterProps {
  vehicleType?: string;
  onChange: (type: string) => void;
}

export const CustomerVehicleTypeFilter: React.FC<CustomerVehicleTypeFilterProps> = ({
  vehicleType,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <Label>Vehicle Type</Label>
      <Select
        value={vehicleType || "_any"}
        onValueChange={onChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Any vehicle type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_any">Any vehicle type</SelectItem>
          <SelectItem value="sedan">Sedan</SelectItem>
          <SelectItem value="suv">SUV</SelectItem>
          <SelectItem value="truck">Truck</SelectItem>
          <SelectItem value="van">Van</SelectItem>
          <SelectItem value="sports">Sports</SelectItem>
          <SelectItem value="luxury">Luxury</SelectItem>
          <SelectItem value="hybrid">Hybrid</SelectItem>
          <SelectItem value="electric">Electric</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
