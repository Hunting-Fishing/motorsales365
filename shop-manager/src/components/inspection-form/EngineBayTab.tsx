
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Wrench, AlertTriangle, ThumbsUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import InspectionItem from "./shared/InspectionItem";
import ImageUploadButton from './shared/ImageUploadButton';

const EngineBayTab = () => {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border border-green-100 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 pb-4">
          <CardTitle className="text-xl font-semibold flex items-center text-green-900">
            <Wrench className="mr-2 h-5 w-5 text-green-700" />
            Engine Bay Inspection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Fluid Levels</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionItem 
                label="Engine Oil" 
                options={["Full", "Low", "Very Low", "Leaking"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Coolant" 
                options={["Full", "Low", "Very Low", "Leaking"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Brake Fluid" 
                options={["Full", "Low", "Very Low", "Leaking"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Power Steering" 
                options={["Full", "Low", "Very Low", "Leaking"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Windshield Washer" 
                options={["Full", "Low", "Empty"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Transmission Fluid" 
                options={["Full", "Low", "Very Low", "Leaking"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Components</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionItem 
                label="Battery" 
                options={["Good", "Weak", "Dead", "Corroded"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Alternator" 
                options={["Working", "Noise", "Failing"]}
                icon={<ThumbsUp className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Belts" 
                options={["Good", "Cracked", "Loose", "Missing"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Hoses" 
                options={["Good", "Cracked", "Leaking"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Air Filter" 
                options={["Clean", "Dirty", "Very Dirty"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Radiator" 
                options={["Good", "Leaking", "Damaged"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Leaks & Visual Inspection</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="oil-leaks" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="oil-leaks" className="text-sm font-medium leading-none">
                    Oil Leaks
                  </Label>
                  <p className="text-sm text-muted-foreground">Check for visible oil leaks or drips</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="coolant-leaks" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="coolant-leaks" className="text-sm font-medium leading-none">
                    Coolant Leaks
                  </Label>
                  <p className="text-sm text-muted-foreground">Check for coolant leaks or residue</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="transmission-leaks" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="transmission-leaks" className="text-sm font-medium leading-none">
                    Transmission Leaks
                  </Label>
                  <p className="text-sm text-muted-foreground">Check for transmission fluid leaks</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="vacuum-leaks" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="vacuum-leaks" className="text-sm font-medium leading-none">
                    Vacuum Leaks
                  </Label>
                  <p className="text-sm text-muted-foreground">Check for vacuum leaks or hissing sounds</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Engine Performance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionItem 
                label="Cold Start" 
                options={["Normal", "Rough", "Difficult", "Won't Start"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Idle" 
                options={["Smooth", "Rough", "Fluctuating", "Stalling"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Acceleration" 
                options={["Normal", "Hesitation", "Sluggish", "Misfiring"]}
                icon={<ThumbsUp className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Engine Noise" 
                options={["Quiet", "Light Noise", "Knocking", "Loud"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="engine-notes">Additional Notes on Engine Bay</Label>
            <Textarea 
              id="engine-notes"
              placeholder="Enter any additional notes about the engine condition"
              className="min-h-[100px]"
            />
          </div>
          
          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-sm">Engine Bay Photos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadButton label="Engine Overall" />
              <ImageUploadButton label="Specific Issues" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EngineBayTab;
