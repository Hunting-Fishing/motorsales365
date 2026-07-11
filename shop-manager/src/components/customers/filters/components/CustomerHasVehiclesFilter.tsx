
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomerHasVehiclesFilterProps {
  hasVehicles?: string;
  onChange: (value: string) => void;
}

export const CustomerHasVehiclesFilter: React.FC<CustomerHasVehiclesFilterProps> = ({
  hasVehicles,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <Label>Has Vehicles</Label>
      <Select
        value={hasVehicles || "_any"}
        onValueChange={onChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_any">Any</SelectItem>
          <SelectItem value="yes">Has vehicles</SelectItem>
          <SelectItem value="no">No vehicles</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
