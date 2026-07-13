import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Car, 
  MapPin,
  FileText,
  Camera,
  Plus,
  Trash2,
  Eye
} from "lucide-react";
import { VehicleBodyStyle } from "@/types/vehicleBodyStyles";
import { cn } from "@/lib/utils";
import { VehicleDamageMarker } from "./VehicleDamageMarker";
import { DamageDetailsPanel } from "./DamageDetailsPanel";

export interface DamageArea {
  id: string;
  x: number;
  y: number;
  type: 'dent' | 'scratch' | 'rust' | 'paint_damage' | 'collision' | 'wear' | 'other';
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  notes?: string;
  photos?: string[];
  estimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface InteractiveVehicleDamageSelectorProps {
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

export const InteractiveVehicleDamageSelector: React.FC<InteractiveVehicleDamageSelectorProps> = ({
  bodyStyle = "suv",
  damages = [],
  onDamagesChange,
  className,
  vehicleInfo
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedView, setSelectedView] = useState<'exterior' | 'interior' | 'engine' | 'undercarriage'>('exterior');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedDamage, setSelectedDamage] = useState<DamageArea | null>(null);
  const [isAddingDamage, setIsAddingDamage] = useState(false);
  const vehicleRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleVehicleClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!isAddingDamage || !vehicleRef.current) return;

    const rect = vehicleRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left - pan.x) / zoom);
    const y = ((event.clientY - rect.top - pan.y) / zoom);

    const newDamage: DamageArea = {
      id: `damage-${Date.now()}`,
      x,
      y,
      type: 'dent',
      severity: 'minor',
      description: 'New damage area',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onDamagesChange([...damages, newDamage]);
    setSelectedDamage(newDamage);
    setIsAddingDamage(false);
  }, [isAddingDamage, damages, onDamagesChange, zoom, pan]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
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

  const renderVehicleWithDamages = () => {
    return (
      <div className="relative w-full h-full min-h-[400px] bg-slate-50 rounded-lg overflow-hidden">
        <svg
          ref={vehicleRef}
          viewBox="0 0 800 400"
          className="w-full h-full cursor-crosshair"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center'
          }}
          onClick={handleVehicleClick}
        >
          {/* Enhanced SUV Vehicle Diagram */}
          <defs>
            <linearGradient id="vehicleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="windowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>
          </defs>

          {/* Vehicle Body */}
          <path
            d="M100,300 L700,300 C720,300 740,280 740,260 L740,180 C740,160 720,140 700,140 L650,140 L620,100 L180,100 L150,140 L100,140 C80,140 60,160 60,180 L60,260 C60,280 80,300 100,300 Z"
            fill="url(#vehicleGradient)"
            stroke="#1e293b"
            strokeWidth="3"
          />

          {/* Front Windshield */}
          <path
            d="M180,140 L620,140 L620,200 L180,200 Z"
            fill="url(#windowGradient)"
            stroke="#1e293b"
            strokeWidth="2"
          />

          {/* Side Windows */}
          <path
            d="M180,200 L300,200 L300,240 L180,240 Z"
            fill="url(#windowGradient)"
            stroke="#1e293b"
            strokeWidth="2"
          />
          <path
            d="M500,200 L620,200 L620,240 L500,240 Z"
            fill="url(#windowGradient)"
            stroke="#1e293b"
            strokeWidth="2"
          />

          {/* Doors */}
          <line x1="300" y1="140" x2="300" y2="280" stroke="#1e293b" strokeWidth="2" />
          <line x1="500" y1="140" x2="500" y2="280" stroke="#1e293b" strokeWidth="2" />

          {/* Wheels */}
          <circle cx="180" cy="300" r="30" fill="#374151" stroke="#1e293b" strokeWidth="2" />
          <circle cx="620" cy="300" r="30" fill="#374151" stroke="#1e293b" strokeWidth="2" />
          <circle cx="180" cy="300" r="20" fill="#6b7280" />
          <circle cx="620" cy="300" r="20" fill="#6b7280" />

          {/* Headlights */}
          <ellipse cx="720" cy="200" rx="15" ry="25" fill="#fef3c7" stroke="#1e293b" strokeWidth="2" />
          <ellipse cx="720" cy="240" rx="15" ry="25" fill="#fef3c7" stroke="#1e293b" strokeWidth="2" />

          {/* Taillights */}
          <ellipse cx="80" cy="200" rx="12" ry="20" fill="#fee2e2" stroke="#1e293b" strokeWidth="2" />
          <ellipse cx="80" cy="240" rx="12" ry="20" fill="#fee2e2" stroke="#1e293b" strokeWidth="2" />

          {/* Grille */}
          <rect x="700" y="190" width="40" height="60" fill="#374151" stroke="#1e293b" strokeWidth="2" />
          <line x1="710" y1="200" x2="730" y2="200" stroke="#6b7280" strokeWidth="1" />
          <line x1="710" y1="220" x2="730" y2="220" stroke="#6b7280" strokeWidth="1" />
          <line x1="710" y1="240" x2="730" y2="240" stroke="#6b7280" strokeWidth="1" />

          {/* Damage Markers */}
          {damages.map((damage) => (
            <VehicleDamageMarker
              key={damage.id}
              damage={damage}
              isSelected={selectedDamage?.id === damage.id}
              onClick={() => setSelectedDamage(damage)}
            />
          ))}
        </svg>

        {/* Damage Count Badge */}
        {damages.length > 0 && (
          <Badge 
            variant="outline" 
            className="absolute top-4 right-4 bg-white border-border text-foreground"
          >
            {damages.length} damage area{damages.length !== 1 ? 's' : ''} marked
          </Badge>
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
            Vehicle Condition & Notes
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
            Inspect
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48 relative">
          {renderVehicleWithDamages()}
        </div>
        {damages.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-muted-foreground">Total Areas:</div>
              <div className="font-medium">{damages.length}</div>
              <div className="text-muted-foreground">Severe Issues:</div>
              <div className="font-medium text-destructive">
                {damages.filter(d => d.severity === 'severe').length}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const FullScreenView = () => (
    <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5" />
            Vehicle Damage Inspector
            {vehicleInfo && (
              <span className="text-base font-normal text-muted-foreground">
                - {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Main Vehicle View */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
                  <TabsList className="h-9">
                    <TabsTrigger value="exterior" className="text-xs">Exterior</TabsTrigger>
                    <TabsTrigger value="interior" className="text-xs">Interior</TabsTrigger>
                    <TabsTrigger value="engine" className="text-xs">Engine Bay</TabsTrigger>
                    <TabsTrigger value="undercarriage" className="text-xs">Under Vehicle</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Zoom: {Math.round(zoom * 100)}%
                </Badge>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleResetView}>
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant={isAddingDamage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAddingDamage(!isAddingDamage)}
                  className={isAddingDamage ? "bg-primary text-primary-foreground" : ""}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Damage
                </Button>
              </div>
            </div>

            {/* Vehicle Display */}
            <div className="flex-1 p-4">
              {renderVehicleWithDamages()}
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 border-l bg-muted/20">
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