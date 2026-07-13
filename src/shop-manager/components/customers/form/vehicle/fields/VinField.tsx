
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HelpCircle, Zap, AlertCircle, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BaseFieldProps } from "./BaseFieldTypes";
import { VinDecodeResult } from "@/types/vehicle";

interface VinFieldProps extends BaseFieldProps {
  processing?: boolean;
  error?: string | null;
  canRetry?: boolean;
  hasAttempted?: boolean;
  onRetry?: () => void;
  decodedVehicleInfo?: VinDecodeResult | null;
  onVinDecode?: (vin: string) => void;
}

export const VinField: React.FC<VinFieldProps> = ({ 
  form, 
  index, 
  processing = false,
  error = null,
  canRetry = false,
  hasAttempted = false,
  onRetry,
  decodedVehicleInfo,
  onVinDecode
}) => {
  const currentVin = form.watch(`vehicles.${index}.vin`) || "";

  const handleVinChange = (value: string) => {
    const cleanVin = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Only auto-decode if this is a new complete VIN (17 characters)
    if (cleanVin.length === 17 && onVinDecode && !processing) {
      onVinDecode(cleanVin);
    }
  };

  const handleDecodeClick = () => {
    // Allow manual decode if VIN is 17 characters, regardless of previous decode attempts
    if (currentVin.length === 17 && onVinDecode && !processing) {
      onVinDecode(currentVin);
    }
  };

  return (
    <FormField
      control={form.control}
      name={`vehicles.${index}.vin`}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-2">
            <FormLabel>VIN</FormLabel>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>17-character Vehicle Identification Number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Decode Button */}
          <div className="mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDecodeClick}
              disabled={processing || currentVin.length !== 17}
              className="w-full"
            >
              {processing ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  Decoding VIN...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {decodedVehicleInfo ? "Re-decode VIN" : "Decode VIN"}
                </>
              )}
            </Button>
          </div>

          {/* Show VIN decode status */}
          {processing && (
            <div className="mb-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                <Zap className="h-3 w-3 mr-1 animate-pulse" />
                Decoding VIN...
              </Badge>
            </div>
          )}

          {error && (
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                VIN decode failed
              </Badge>
              {canRetry && onRetry && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="h-6 px-2"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          )}

          {decodedVehicleInfo && !processing && (
            <div className="mb-2">
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                <Zap className="h-3 w-3 mr-1" />
                VIN decoded successfully
              </Badge>
            </div>
          )}

          <div className="flex gap-2">
            <FormControl>
              <Input
                {...field}
                placeholder="17-character VIN"
                maxLength={17}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  field.onChange(value);
                  handleVinChange(value);
                }}
                className="font-mono"
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
