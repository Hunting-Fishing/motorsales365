
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, CarFront, ThumbsUp, ThumbsDown, AlertTriangle, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import InspectionItem from "./shared/InspectionItem";
import ImageUploadButton from './shared/ImageUploadButton';

const InteriorCheckTab = () => {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border border-indigo-100 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 pb-4">
          <CardTitle className="text-xl font-semibold flex items-center text-indigo-900">
            <CarFront className="mr-2 h-5 w-5 text-indigo-700" />
            Interior Inspection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <InspectionItem 
              label="Dashboard Lights" 
              options={["All Working", "Some Issues", "Warning Lights On"]}
              icon={<AlertTriangle className="h-4 w-4" />} 
            />
            <InspectionItem 
              label="Horn" 
              options={["Working", "Faint", "Not Working"]}
              icon={<ThumbsUp className="h-4 w-4" />} 
            />
            <InspectionItem 
              label="Air Conditioning" 
              options={["Cold", "Weak", "Not Working"]}
              icon={<ThumbsUp className="h-4 w-4" />} 
            />
            <InspectionItem 
              label="Heater" 
              options={["Hot", "Weak", "Not Working"]}
              icon={<ThumbsUp className="h-4 w-4" />} 
            />
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Seats & Upholstery</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionItem 
                label="Driver's Seat" 
                options={["Good", "Fair", "Poor", "Damaged"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Passenger Seat" 
                options={["Good", "Fair", "Poor", "Damaged"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Rear Seats" 
                options={["Good", "Fair", "Poor", "Damaged"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Floor Mats/Carpet" 
                options={["Clean", "Stained", "Damaged", "Missing"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Controls & Electronics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="power-windows" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="power-windows" className="text-sm font-medium leading-none">
                    Power Windows
                  </Label>
                  <p className="text-sm text-muted-foreground">Check all windows operate properly</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="power-locks" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="power-locks" className="text-sm font-medium leading-none">
                    Power Locks
                  </Label>
                  <p className="text-sm text-muted-foreground">Verify all doors lock/unlock</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="radio" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="radio" className="text-sm font-medium leading-none">
                    Radio/Infotainment
                  </Label>
                  <p className="text-sm text-muted-foreground">Check for proper operation</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="bluetooth" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="bluetooth" className="text-sm font-medium leading-none">
                    Bluetooth/Connectivity
                  </Label>
                  <p className="text-sm text-muted-foreground">Test phone connection if available</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Safety Equipment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="seatbelts" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="seatbelts" className="text-sm font-medium leading-none">
                    Seatbelts
                  </Label>
                  <p className="text-sm text-muted-foreground">Check all seatbelts retract and latch</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="airbag-light" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="airbag-light" className="text-sm font-medium leading-none">
                    Airbag Light
                  </Label>
                  <p className="text-sm text-muted-foreground">Check airbag light operates correctly</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Interior Odor Assessment</h3>
            <RadioGroup defaultValue="none" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col items-center space-y-2 border p-3 rounded-md">
                <RadioGroupItem value="none" id="odor-none" className="mx-auto" />
                <Label htmlFor="odor-none" className="text-sm">No Odor</Label>
              </div>
              <div className="flex flex-col items-center space-y-2 border p-3 rounded-md">
                <RadioGroupItem value="mild" id="odor-mild" className="mx-auto" />
                <Label htmlFor="odor-mild" className="text-sm">Mild Odor</Label>
              </div>
              <div className="flex flex-col items-center space-y-2 border p-3 rounded-md">
                <RadioGroupItem value="moderate" id="odor-moderate" className="mx-auto" />
                <Label htmlFor="odor-moderate" className="text-sm">Moderate Odor</Label>
              </div>
              <div className="flex flex-col items-center space-y-2 border p-3 rounded-md">
                <RadioGroupItem value="strong" id="odor-strong" className="mx-auto" />
                <Label htmlFor="odor-strong" className="text-sm">Strong Odor</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label htmlFor="interior-notes">Additional Notes on Interior</Label>
            <Textarea 
              id="interior-notes"
              placeholder="Enter any additional notes about the interior condition"
              className="min-h-[100px]"
            />
          </div>
          
          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-sm">Interior Photos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ImageUploadButton label="Dashboard" />
              <ImageUploadButton label="Driver's Seat" />
              <ImageUploadButton label="Rear Seats" />
              <ImageUploadButton label="Cargo Area" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteriorCheckTab;
