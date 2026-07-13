
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CircleDashed, AlertTriangle, ThumbsUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider"
import InspectionItem from "./shared/InspectionItem";
import ImageUploadButton from './shared/ImageUploadButton';
import TireTreadCard from './shared/TireTreadCard';

const TiresTab = () => {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border border-amber-100 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 pb-4">
          <CardTitle className="text-xl font-semibold flex items-center text-amber-900">
            <CircleDashed className="mr-2 h-5 w-5 text-amber-700" />
            Tires & Suspension Inspection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6 mb-6">
            <h3 className="font-medium">Tire Pressure (PSI)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-sm mb-4">Front Tires</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="front-left-psi" className="text-sm">Front Left</Label>
                    <div className="flex items-center mt-1">
                      <Input 
                        id="front-left-psi" 
                        type="number" 
                        placeholder="PSI" 
                        className="w-20 mr-2" 
                      />
                      <span className="text-sm text-muted-foreground">PSI</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="front-right-psi" className="text-sm">Front Right</Label>
                    <div className="flex items-center mt-1">
                      <Input 
                        id="front-right-psi" 
                        type="number" 
                        placeholder="PSI" 
                        className="w-20 mr-2" 
                      />
                      <span className="text-sm text-muted-foreground">PSI</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-4">Rear Tires</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rear-left-psi" className="text-sm">Rear Left</Label>
                    <div className="flex items-center mt-1">
                      <Input 
                        id="rear-left-psi" 
                        type="number" 
                        placeholder="PSI" 
                        className="w-20 mr-2" 
                      />
                      <span className="text-sm text-muted-foreground">PSI</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="rear-right-psi" className="text-sm">Rear Right</Label>
                    <div className="flex items-center mt-1">
                      <Input 
                        id="rear-right-psi" 
                        type="number" 
                        placeholder="PSI" 
                        className="w-20 mr-2" 
                      />
                      <span className="text-sm text-muted-foreground">PSI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 mb-6">
            <h3 className="font-medium">Tire Tread Depth</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TireTreadCard position="Front Left" />
              <TireTreadCard position="Front Right" />
              <TireTreadCard position="Rear Left" />
              <TireTreadCard position="Rear Right" />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Tire Condition</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionItem 
                label="Front Left Tire" 
                options={["Good", "Fair", "Poor", "Replace"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Front Right Tire" 
                options={["Good", "Fair", "Poor", "Replace"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Rear Left Tire" 
                options={["Good", "Fair", "Poor", "Replace"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Rear Right Tire" 
                options={["Good", "Fair", "Poor", "Replace"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Spare Tire" 
                options={["Good", "Fair", "Poor", "Missing"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Wheel & Alignment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionItem 
                label="Wheel Balance" 
                options={["Balanced", "Vibration", "Needs Balance"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Wheel Alignment" 
                options={["Aligned", "Pulls Left", "Pulls Right"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="wheel-damage" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="wheel-damage" className="text-sm font-medium leading-none">
                    Wheel Damage
                  </Label>
                  <p className="text-sm text-muted-foreground">Check for scuffs, dents, or damage</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border p-3 rounded-md">
                <Checkbox id="lug-nuts" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="lug-nuts" className="text-sm font-medium leading-none">
                    Lug Nuts Tight
                  </Label>
                  <p className="text-sm text-muted-foreground">Verify lug nuts properly torqued</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-sm">Suspension & Brakes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionItem 
                label="Brake Pads Front" 
                options={["Over 50%", "30-50%", "Under 30%", "Metal-to-Metal"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Brake Pads Rear" 
                options={["Over 50%", "30-50%", "Under 30%", "Metal-to-Metal"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Brake Discs Front" 
                options={["Good", "Scored", "Warped", "Replace"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Brake Discs Rear" 
                options={["Good", "Scored", "Warped", "Replace"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Shocks/Struts" 
                options={["Good", "Leaking", "Worn", "Replace"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
              <InspectionItem 
                label="Springs" 
                options={["Good", "Worn", "Sagging", "Broken"]}
                icon={<AlertTriangle className="h-4 w-4" />} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="suspension-notes">Additional Notes on Tires & Suspension</Label>
            <Textarea 
              id="suspension-notes"
              placeholder="Enter any additional notes about tire condition or suspension issues"
              className="min-h-[100px]"
            />
          </div>
          
          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-sm">Tire & Suspension Photos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadButton label="Tire Issues" />
              <ImageUploadButton label="Suspension Issues" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TiresTab;
