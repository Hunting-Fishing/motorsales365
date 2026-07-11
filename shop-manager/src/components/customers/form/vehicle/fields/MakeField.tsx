
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HelpCircle, Car } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BaseFieldProps } from "./BaseFieldTypes";
import { CarMake } from "@/types/vehicle";

interface MakeFieldProps extends BaseFieldProps {
  makes: CarMake[];
  onMakeChange?: (make: string) => void;
  isLoadingMakes?: boolean;
  makesError?: string | null;
}

export const MakeField: React.FC<MakeFieldProps> = ({ 
  form, 
  index, 
  makes = [], 
  onMakeChange, 
  isLoadingMakes = false, 
  makesError = null 
}) => {
  // Ensure makes is valid array
  const safeMakes = Array.isArray(makes) ? makes : [];
  
  // Get the current form values safely
  const currentValues = form.getValues();
  const vehicleData = currentValues.vehicles?.[index];
  const decodedMake = vehicleData?.decoded_make;
  const currentMakeValue = form.watch(`vehicles.${index}.make`);
  
  console.log('🏷️ MakeField render - vehicle index:', index);
  console.log('🏷️ MakeField render - makes count:', safeMakes.length);
  console.log('🏷️ MakeField render - loading:', isLoadingMakes);
  console.log('🏷️ MakeField render - error:', makesError);
  console.log('🏷️ MakeField render - current form value:', currentMakeValue);
  console.log('🏷️ MakeField render - decoded make:', decodedMake);
  
  if (makesError) {
    console.error('❌ MakeField: Makes loading error:', makesError);
  }
  
  // Check if current value is a VIN decoded value (not in our makes list)
  const isVinDecodedValue = currentMakeValue && 
    !safeMakes.find(make => make.make_id === currentMakeValue) &&
    (decodedMake || safeMakes.length === 0 || isLoadingMakes);
  
  return (
    <FormField
      control={form.control}
      name={`vehicles.${index}.make`}
      render={({ field }) => {
        console.log('MakeField field value:', field.value);
        
        return (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel>Make</FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Vehicle manufacturer (e.g., Toyota, Ford)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Show debugging info and status */}
            {(isLoadingMakes || makesError || isVinDecodedValue) && (
              <div className="mb-2 space-y-1">
                {isLoadingMakes && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Loading makes...
                  </Badge>
                )}
                {makesError && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Error: {makesError}
                  </Badge>
                )}
                {isVinDecodedValue && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Car className="h-3 w-3 mr-1" />
                    VIN Decoded: {field.value}
                  </Badge>
                )}
              </div>
            )}

            {/* Show different UI based on makes availability */}
            {isLoadingMakes ? (
              <FormControl>
                <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md text-muted-foreground">
                  Loading makes...
                </div>
              </FormControl>
            ) : safeMakes.length > 0 ? (
              <Select
                value={!isVinDecodedValue ? field.value || "" : ""}
                onValueChange={(value) => {
                  console.log("🏷️ MakeField: Value changed to:", value);
                  if (value === "none") {
                    // Clear both values when user selects "none"
                    field.onChange("");
                    form.setValue(`vehicles.${index}.decoded_make`, '');
                  } else {
                    field.onChange(value);
                    // Clear decoded make when manually selecting
                    form.setValue(`vehicles.${index}.decoded_make`, '');
                  }
                  if (onMakeChange) {
                    onMakeChange(value === "none" ? "" : value);
                  }
                }}
                disabled={field.disabled}
              >
                <FormControl>
                  <SelectTrigger className={isVinDecodedValue ? "border-green-200 bg-green-50" : ""}>
                    <SelectValue placeholder={
                      isVinDecodedValue ? `VIN: ${field.value} (click to override)` : "Select make"
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Show option to clear VIN decoded value */}
                  {isVinDecodedValue && (
                    <SelectItem value="none" className="text-muted-foreground">
                      Clear VIN decoded value
                    </SelectItem>
                  )}
                  
                  {safeMakes
                    .filter(make => make.make_id && make.make_display) // Filter out invalid makes
                    .map((make) => (
                      <SelectItem key={make.make_id} value={make.make_id}>
                        {make.make_display}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <FormControl>
                <Input 
                  {...field} 
                  placeholder={makesError ? "Error loading makes - enter manually" : "Enter vehicle make"}
                  value={field.value || ""}
                  onChange={(e) => {
                    console.log("🏷️ MakeField: Manual input changed to:", e.target.value);
                    field.onChange(e.target.value);
                    // Clear decoded make when manually entering
                    form.setValue(`vehicles.${index}.decoded_make`, '');
                    if (onMakeChange) {
                      onMakeChange(e.target.value);
                    }
                  }}
                  className={isVinDecodedValue ? "border-green-200 bg-green-50" : makesError ? "border-red-200 bg-red-50" : ""}
                />
              </FormControl>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
