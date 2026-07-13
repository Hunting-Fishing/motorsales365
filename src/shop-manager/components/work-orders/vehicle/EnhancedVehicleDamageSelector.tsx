import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Car, 
  Eye,
  Grid,
  Ruler,
  Camera,
  FileText,
  Download,
  Settings,
  Info
} from "lucide-react";
import { VehicleBodyStyle } from "@/types/vehicleBodyStyles";
import { cn } from "@/lib/utils";
import { ProfessionalVehicleDiagram } from "./ProfessionalVehicleDiagram";
import { VehicleDamageMarker } from "./VehicleDamageMarker";
import { DamageDetailsPanel } from "./DamageDetailsPanel";

import { DamageArea } from "./InteractiveVehicleDamageSelector";

export type { DamageArea };

interface EnhancedVehicleDamageSelectorProps {
  bodyStyle: VehicleBodyStyle;
  damages: DamageArea[];
  onDamagesChange: (damages: DamageArea[]) => void;
  className?: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year: string;
    color?: string;
  };
}

type ViewType = 'side' | 'top' | 'front' | 'rear';

const bodyPanelMap = {
  side: {
    'hood': { x: [850, 1050], y: [280, 380] },
    'front-door': { x: [550, 750], y: [280, 450] },
    'rear-door': { x: [350, 550], y: [280, 450] },
    'tailgate': { x: [150, 350], y: [280, 450] },
    'front-wheel': { x: [790, 910], y: [390, 510] },
    'rear-wheel': { x: [290, 410], y: [390, 510] },
    'roof': { x: [350, 850], y: [120, 280] }
  },
  top: {
    'hood': { x: [270, 530], y: [150, 450] },
    'roof': { x: [280, 520], y: [570, 870] },
    'trunk': { x: [270, 530], y: [890, 1050] },
    'left-side': { x: [250, 280], y: [150, 1050] },
    'right-side': { x: [520, 550], y: [150, 1050] }
  },
  front: {
    'hood': { x: [300, 700], y: [400, 500] },
    'windshield': { x: [350, 650], y: [80, 160] },
    'left-headlight': { x: [290, 350], y: [420, 460] },
    'right-headlight': { x: [650, 710], y: [420, 460] },
    'grille': { x: [380, 620], y: [420, 480] }
  },
  rear: {
    'tailgate': { x: [300, 700], y: [400, 500] },
    'rear-windshield': { x: [350, 650], y: [80, 160] },
    'left-taillight': { x: [295, 345], y: [410, 470] },
    'right-taillight': { x: [655, 705], y: [410, 470] }
  }
};

export const EnhancedVehicleDamageSelector: React.FC<EnhancedVehicleDamageSelectorProps> = ({
  bodyStyle = "suv",
  damages = [],
  onDamagesChange,
  className,
  vehicleInfo
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedView, setSelectedView] = useState<ViewType>('side');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedDamage, setSelectedDamage] = useState<DamageArea | null>(null);
  const [isAddingDamage, setIsAddingDamage] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showBodyPanels, setShowBodyPanels] = useState(false);
  const vehicleRef = useRef<HTMLDivElement>(null);

  const getBodyPanel = (x: number, y: number, view: ViewType): string => {
    const panels = bodyPanelMap[view];
    for (const [panelName, bounds] of Object.entries(panels)) {
      if (x >= bounds.x[0] && x <= bounds.x[1] && y >= bounds.y[0] && y <= bounds.y[1]) {
        return panelName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
    return 'Unknown Panel';
  };

  const handleVehicleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingDamage || !vehicleRef.current) return;

    const rect = vehicleRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left - pan.x) / zoom);
    const y = ((event.clientY - rect.top - pan.y) / zoom);
    
    const bodyPanel = getBodyPanel(x, y, selectedView);

    const newDamage: DamageArea = {
      id: `damage-${Date.now()}`,
      x,
      y,
      type: 'dent',
      severity: 'minor',
      description: `${bodyPanel} damage`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onDamagesChange([...damages, newDamage]);
    setSelectedDamage(newDamage);
    setIsAddingDamage(false);
  }, [isAddingDamage, damages, onDamagesChange, zoom, pan, selectedView]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDamageUpdate = (updatedDamage: DamageArea) => {
    const updatedDamages = damages.map(d => 
      d.id === updatedDamage.id ? { ...updatedDamage, updatedAt: new Date() } : d
    );
    onDamagesChange(updatedDamages);
    setSelectedDamage(updatedDamage);
  };

  const handleDamageDelete = (damageId: string) => {
    const updatedDamages = damages.filter(d => d.id !== damageId);
    onDamagesChange(updatedDamages);
    setSelectedDamage(null);
  };

  const viewDamages = damages; // Show all damages for now since original doesn't have view property
  const allDamageCount = damages.length;
  const severeDamageCount = damages.filter(d => d.severity === 'severe').length;

  const renderVehicleWithDamages = () => {
    return (
      <div 
        ref={vehicleRef}
        className="relative w-full h-full min-h-[500px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden border"
        onClick={handleVehicleClick}
        style={{ cursor: isAddingDamage ? 'crosshair' : 'default' }}
      >
        {/* Professional Grid Overlay */}
        {showGrid && (
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e2e8f0 1px, transparent 1px),
                linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
              `,
              backgroundSize: '25px 25px'
            }}
          />
        )}

        {/* Vehicle Diagram Container */}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-in-out'
          }}
        >
          <div className="relative">
            <ProfessionalVehicleDiagram 
              view={selectedView}
              vehicleType={bodyStyle}
              className="w-full h-full drop-shadow-lg"
            />

            {/* Damage Markers as Overlay */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={selectedView === 'top' ? '0 0 800 1200' : '0 0 1200 600'}
            >
              {viewDamages.map((damage) => (
                <VehicleDamageMarker
                  key={damage.id}
                  damage={damage}
                  isSelected={selectedDamage?.id === damage.id}
                  onClick={() => setSelectedDamage(damage)}
                />
              ))}
            </svg>

            {/* Body Panel Highlights */}
            {showBodyPanels && (
              <div className="absolute inset-0 pointer-events-none">
                {/* This would show clickable body panel overlays */}
              </div>
            )}
          </div>
        </div>

        {/* Status Overlays */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {allDamageCount > 0 && (
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
              {allDamageCount} damage area{allDamageCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {severeDamageCount > 0 && (
            <Badge variant="destructive" className="bg-red-500/90 text-white backdrop-blur-sm">
              {severeDamageCount} severe issue{severeDamageCount !== 1 ? 's' : ''}
            </Badge>
          )}
          <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-xs">
            {selectedView.toUpperCase()} VIEW
          </Badge>
        </div>

        {/* View Statistics */}
        <div className="absolute bottom-4 left-4">
          <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-xs">
            {viewDamages.length} damage{viewDamages.length !== 1 ? 's' : ''} in this view
          </Badge>
        </div>

        {/* Crosshair for adding damage */}
        {isAddingDamage && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-primary opacity-50" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary opacity-50" />
          </div>
        )}
      </div>
    );
  };

  const CompactView = () => (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicle Condition Assessment
            {vehicleInfo && (
              <span className="text-sm font-normal text-muted-foreground">
                - {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
              </span>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullScreen(true)}
            className="h-8 px-3"
          >
            <Eye className="h-3 w-3 mr-1" />
            Professional Inspector
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-56 relative">
          {renderVehicleWithDamages()}
        </div>
        {allDamageCount > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <div className="font-semibold text-lg">{allDamageCount}</div>
                <div className="text-muted-foreground">Total Areas</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-amber-600">
                  {damages.filter(d => d.severity === 'moderate').length}
                </div>
                <div className="text-muted-foreground">Moderate</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-destructive">
                  {severeDamageCount}
                </div>
                <div className="text-muted-foreground">Severe</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const FullScreenView = () => (
    <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Car className="h-6 w-6 text-primary" />
            Professional Vehicle Damage Inspector
            {vehicleInfo && (
              <span className="text-lg font-normal text-muted-foreground">
                - {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
              </span>
            )}
            <Badge variant="outline" className="ml-auto">
              Automotive Grade Assessment
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Main Vehicle View */}
          <div className="flex-1 flex flex-col">
            {/* Professional Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
              <div className="flex items-center gap-4">
                <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as ViewType)}>
                  <TabsList className="h-10 bg-white">
                    <TabsTrigger value="side" className="px-4">Side Profile</TabsTrigger>
                    <TabsTrigger value="top" className="px-4">Top View</TabsTrigger>
                    <TabsTrigger value="front" className="px-4">Front View</TabsTrigger>
                    <TabsTrigger value="rear" className="px-4">Rear View</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                  <Button
                    variant={showGrid ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowGrid(!showGrid)}
                  >
                    <Grid className="h-4 w-4 mr-1" />
                    Grid
                  </Button>
                  <Button
                    variant={showMeasurements ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMeasurements(!showMeasurements)}
                  >
                    <Ruler className="h-4 w-4 mr-1" />
                    Measure
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  Zoom: {Math.round(zoom * 100)}%
                </Badge>
                
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleResetView}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                
                <Separator orientation="vertical" className="h-8" />
                
                <Button
                  variant={isAddingDamage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAddingDamage(!isAddingDamage)}
                  className={cn(
                    "px-4",
                    isAddingDamage && "bg-primary text-primary-foreground shadow-lg"
                  )}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Mark Damage
                </Button>

                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* Vehicle Display */}
            <div className="flex-1 p-6">
              {renderVehicleWithDamages()}
            </div>
          </div>

          {/* Enhanced Side Panel */}
          <div className="w-96 border-l bg-slate-50/50">
            <DamageDetailsPanel
              damages={damages}
              selectedDamage={selectedDamage}
              onDamageSelect={setSelectedDamage}
              onDamageUpdate={handleDamageUpdate}
              onDamageDelete={handleDamageDelete}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <CompactView />
      <FullScreenView />
    </>
  );
};