
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { 
  VinField, 
  YearField, 
  MakeField, 
  ModelField, 
  LicensePlateField,
  EquipmentTypeField
} from "./fields";
import { VehicleAdditionalDetails } from "./VehicleAdditionalDetails";
import { useVehicleForm } from "./useVehicleForm";
import { DebugVehicleForm } from "../DebugVehicleForm";

interface VehicleSelectorProps {
  form: UseFormReturn<any>;
  index: number;
  onRemove: (index: number) => void;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  form,
  index,
  onRemove
}) => {
  const {
    makes, 
    models, 
    vinProcessing, 
    vinError,
    canRetry,
    hasAttempted,
    decodedVehicleInfo, 
    fetchModels,
    handleVinDecode,
    onVinRetry,
    isLoadingMakes,
    makesError
  } = useVehicleForm({ form, index });

  const make = form.watch(`vehicles.${index}.make`);

  return (
    <Card className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-6 w-6 p-0 rounded-full"
        onClick={() => onRemove(index)}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardContent className="pt-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <VinField 
            form={form} 
            index={index} 
            processing={vinProcessing}
            error={vinError}
            canRetry={canRetry}
            hasAttempted={hasAttempted}
            onRetry={onVinRetry}
            decodedVehicleInfo={decodedVehicleInfo}
            onVinDecode={handleVinDecode}
          />
          <LicensePlateField form={form} index={index} />
          <EquipmentTypeField form={form} index={index} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <YearField 
            form={form} 
            index={index}
            years={Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i)}
          />
            <MakeField 
              form={form} 
              index={index} 
              makes={makes} 
              onMakeChange={(selectedMake) => {
                fetchModels(selectedMake);
                form.setValue(`vehicles.${index}.model`, '');
              }}
              isLoadingMakes={isLoadingMakes}
              makesError={makesError}
            />
          <ModelField 
            form={form} 
            index={index} 
            models={models}
            selectedMake={make}
          />
        </div>
        <VehicleAdditionalDetails form={form} index={index} decodedDetails={decodedVehicleInfo} />
        
        {/* Debug component for development */}
        <DebugVehicleForm
          form={form}
          index={index}
          makes={makes}
          isLoadingMakes={isLoadingMakes}
          makesError={makesError}
        />
      </CardContent>
    </Card>
  );
};
