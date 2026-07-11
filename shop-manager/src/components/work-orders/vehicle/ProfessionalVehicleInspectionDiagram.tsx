import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3, Eye, Camera, Save } from 'lucide-react';
import vehicleFrontView from '@/assets/vehicle-front-view.jpg';
import vehicleBackView from '@/assets/vehicle-back-view.jpg';
import vehicleTopView from '@/assets/vehicle-top-view.jpg';
import vehicleSideView from '@/assets/vehicle-side-view.jpg';

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
  bodyPanel: string;
  view: 'front' | 'back' | 'top' | 'driver_side' | 'passenger_side';
}

interface VehicleBodyPanel {
  id: string;
  name: string;
  coordinates: { x: number; y: number; width: number; height: number };
  view: 'front' | 'back' | 'top' | 'driver_side' | 'passenger_side';
}

// Precise coordinate mapping for vehicle body panels
const BODY_PANELS: Record<'front' | 'back' | 'top' | 'driver_side' | 'passenger_side', VehicleBodyPanel[]> = {
  front: [
    { id: 'front_bumper', name: 'Front Bumper', coordinates: { x: 300, y: 600, width: 600, height: 100 }, view: 'front' },
    { id: 'left_headlight', name: 'Left Headlight', coordinates: { x: 200, y: 500, width: 150, height: 100 }, view: 'front' },
    { id: 'right_headlight', name: 'Right Headlight', coordinates: { x: 850, y: 500, width: 150, height: 100 }, view: 'front' },
    { id: 'grille', name: 'Grille', coordinates: { x: 450, y: 520, width: 300, height: 80 }, view: 'front' },
    { id: 'front_hood', name: 'Hood', coordinates: { x: 350, y: 300, width: 500, height: 200 }, view: 'front' },
    { id: 'windshield', name: 'Windshield', coordinates: { x: 400, y: 200, width: 400, height: 100 }, view: 'front' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: { x: 150, y: 400, width: 200, height: 300 }, view: 'front' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: { x: 850, y: 400, width: 200, height: 300 }, view: 'front' },
  ],
  back: [
    { id: 'rear_bumper', name: 'Rear Bumper', coordinates: { x: 300, y: 600, width: 600, height: 100 }, view: 'back' },
    { id: 'left_taillight', name: 'Left Taillight', coordinates: { x: 200, y: 500, width: 150, height: 100 }, view: 'back' },
    { id: 'right_taillight', name: 'Right Taillight', coordinates: { x: 850, y: 500, width: 150, height: 100 }, view: 'back' },
    { id: 'rear_window', name: 'Rear Window', coordinates: { x: 400, y: 200, width: 400, height: 100 }, view: 'back' },
    { id: 'trunk_hatch', name: 'Trunk/Hatch', coordinates: { x: 350, y: 300, width: 500, height: 200 }, view: 'back' },
    { id: 'left_rear_fender', name: 'Left Rear Fender', coordinates: { x: 150, y: 400, width: 200, height: 300 }, view: 'back' },
    { id: 'right_rear_fender', name: 'Right Rear Fender', coordinates: { x: 850, y: 400, width: 200, height: 300 }, view: 'back' },
  ],
  top: [
    { id: 'hood', name: 'Hood', coordinates: { x: 450, y: 200, width: 300, height: 180 }, view: 'top' },
    { id: 'roof', name: 'Roof', coordinates: { x: 450, y: 380, width: 300, height: 240 }, view: 'top' },
    { id: 'trunk', name: 'Trunk', coordinates: { x: 450, y: 620, width: 300, height: 120 }, view: 'top' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: { x: 350, y: 380, width: 100, height: 120 }, view: 'top' },
    { id: 'left_rear_door', name: 'Left Rear Door', coordinates: { x: 350, y: 500, width: 100, height: 120 }, view: 'top' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: { x: 750, y: 380, width: 100, height: 120 }, view: 'top' },
    { id: 'right_rear_door', name: 'Right Rear Door', coordinates: { x: 750, y: 500, width: 100, height: 120 }, view: 'top' },
    { id: 'left_fender', name: 'Left Fender', coordinates: { x: 380, y: 200, width: 70, height: 180 }, view: 'top' },
    { id: 'right_fender', name: 'Right Fender', coordinates: { x: 750, y: 200, width: 70, height: 180 }, view: 'top' },
  ],
  driver_side: [
    { id: 'front_bumper', name: 'Front Bumper', coordinates: { x: 100, y: 400, width: 80, height: 200 }, view: 'driver_side' },
    { id: 'rear_bumper', name: 'Rear Bumper', coordinates: { x: 1020, y: 400, width: 80, height: 200 }, view: 'driver_side' },
    { id: 'side_hood', name: 'Hood', coordinates: { x: 180, y: 320, width: 200, height: 80 }, view: 'driver_side' },
    { id: 'side_roof', name: 'Roof', coordinates: { x: 380, y: 200, width: 440, height: 120 }, view: 'driver_side' },
    { id: 'side_trunk', name: 'Trunk', coordinates: { x: 820, y: 320, width: 200, height: 80 }, view: 'driver_side' },
    { id: 'side_front_door', name: 'Front Door', coordinates: { x: 380, y: 320, width: 150, height: 280 }, view: 'driver_side' },
    { id: 'side_rear_door', name: 'Rear Door', coordinates: { x: 530, y: 320, width: 150, height: 280 }, view: 'driver_side' },
    { id: 'side_front_fender', name: 'Front Fender', coordinates: { x: 180, y: 400, width: 200, height: 200 }, view: 'driver_side' },
    { id: 'side_rear_fender', name: 'Rear Fender', coordinates: { x: 680, y: 400, width: 140, height: 200 }, view: 'driver_side' },
  ],
  passenger_side: [
    { id: 'front_bumper', name: 'Front Bumper', coordinates: { x: 100, y: 400, width: 80, height: 200 }, view: 'passenger_side' },
    { id: 'rear_bumper', name: 'Rear Bumper', coordinates: { x: 1020, y: 400, width: 80, height: 200 }, view: 'passenger_side' },
    { id: 'side_hood', name: 'Hood', coordinates: { x: 180, y: 320, width: 200, height: 80 }, view: 'passenger_side' },
    { id: 'side_roof', name: 'Roof', coordinates: { x: 380, y: 200, width: 440, height: 120 }, view: 'passenger_side' },
    { id: 'side_trunk', name: 'Trunk', coordinates: { x: 820, y: 320, width: 200, height: 80 }, view: 'passenger_side' },
    { id: 'side_front_door', name: 'Front Door', coordinates: { x: 380, y: 320, width: 150, height: 280 }, view: 'passenger_side' },
    { id: 'side_rear_door', name: 'Rear Door', coordinates: { x: 530, y: 320, width: 150, height: 280 }, view: 'passenger_side' },
    { id: 'side_front_fender', name: 'Front Fender', coordinates: { x: 180, y: 400, width: 200, height: 200 }, view: 'passenger_side' },
    { id: 'side_rear_fender', name: 'Rear Fender', coordinates: { x: 680, y: 400, width: 140, height: 200 }, view: 'passenger_side' },
  ]
};

const DAMAGE_TYPE_STYLES = {
  dent: { color: '#f59e0b', icon: '●', label: 'Dent' },
  scratch: { color: '#ef4444', icon: '╱', label: 'Scratch' },
  rust: { color: '#dc2626', icon: '◆', label: 'Rust' },
  paint_damage: { color: '#8b5cf6', icon: '◐', label: 'Paint' },
  collision: { color: '#dc2626', icon: '✶', label: 'Collision' },
  wear: { color: '#6b7280', icon: '○', label: 'Wear' },
  other: { color: '#64748b', icon: '?', label: 'Other' }
};

const SEVERITY_STYLES = {
  minor: { size: 8, ringWidth: 2, opacity: 0.8 },
  moderate: { size: 12, ringWidth: 3, opacity: 0.9 },
  severe: { size: 16, ringWidth: 4, opacity: 1 }
};

interface ProfessionalVehicleInspectionDiagramProps {
  damages: DamageArea[];
  onDamagesChange: (damages: DamageArea[]) => void;
  bodyStyle?: string;
  readOnly?: boolean;
}

export const ProfessionalVehicleInspectionDiagram: React.FC<ProfessionalVehicleInspectionDiagramProps> = ({
  damages,
  onDamagesChange,
  readOnly = false
}) => {
  const [activeView, setActiveView] = useState<'front' | 'back' | 'top' | 'driver_side' | 'passenger_side'>('front');
  const [selectedDamage, setSelectedDamage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showPanelLabels, setShowPanelLabels] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the correct image based on active view
  const getVehicleImage = () => {
    switch (activeView) {
      case 'front': return vehicleFrontView;
      case 'back': return vehicleBackView;
      case 'top': return vehicleTopView;
      case 'driver_side': 
      case 'passenger_side': 
        return vehicleSideView;
      default: return vehicleFrontView;
    }
  };

  const handleImageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    // Find which body panel was clicked
    const clickedPanel = BODY_PANELS[activeView].find(panel => 
      x >= panel.coordinates.x && 
      x <= panel.coordinates.x + panel.coordinates.width &&
      y >= panel.coordinates.y && 
      y <= panel.coordinates.y + panel.coordinates.height
    );

    const newDamage: DamageArea = {
      id: `damage-${Date.now()}-${Math.random()}`,
      x,
      y,
      type: 'dent',
      severity: 'minor',
      description: `Damage on ${clickedPanel?.name || 'Unknown Panel'}`,
      bodyPanel: clickedPanel?.name || 'Unknown',
      view: activeView,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onDamagesChange([...damages, newDamage]);
  }, [damages, onDamagesChange, readOnly, activeView, zoom]);

  const currentViewDamages = damages.filter(damage => damage.view === activeView);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const handleResetZoom = () => setZoom(1);

  const DamageMarker: React.FC<{ damage: DamageArea }> = ({ damage }) => {
    const typeStyle = DAMAGE_TYPE_STYLES[damage.type];
    const severityStyle = SEVERITY_STYLES[damage.severity];
    const isSelected = selectedDamage === damage.id;

    return (
      <div 
        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
        style={{ 
          left: damage.x * zoom, 
          top: damage.y * zoom,
          color: typeStyle.color 
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedDamage(isSelected ? null : damage.id);
        }}
      >
        {/* Selection Ring */}
        {isSelected && (
          <div 
            className="absolute animate-pulse rounded-full border-2 border-primary"
            style={{
              width: (severityStyle.size + 16) * zoom,
              height: (severityStyle.size + 16) * zoom,
              left: `calc(-${(severityStyle.size + 16) * zoom / 2}px)`,
              top: `calc(-${(severityStyle.size + 16) * zoom / 2}px)`
            }}
          />
        )}
        
        {/* Damage Marker */}
        <div 
          className="flex items-center justify-center text-white font-bold rounded-full border-2 border-white shadow-lg transition-all duration-200 hover:scale-110"
          style={{
            width: severityStyle.size * zoom,
            height: severityStyle.size * zoom,
            backgroundColor: typeStyle.color,
            fontSize: (severityStyle.size - 4) * zoom
          }}
        >
          {typeStyle.icon}
        </div>
        
        {/* Hover Tooltip */}
        <div className="absolute left-full ml-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            {damage.description}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Vehicle Damage Assessment
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">
              {currentViewDamages.length} damage{currentViewDamages.length !== 1 ? 's' : ''} marked
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* View Controls */}
        <div className="flex justify-between items-center">
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'front' | 'back' | 'top' | 'driver_side' | 'passenger_side')}>
            <TabsList>
              <TabsTrigger value="front">Front</TabsTrigger>
              <TabsTrigger value="back">Back</TabsTrigger>
              <TabsTrigger value="top">Top</TabsTrigger>
              <TabsTrigger value="driver_side">Driver Side</TabsTrigger>
              <TabsTrigger value="passenger_side">Passenger Side</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
              className={showGrid ? 'bg-primary/10' : ''}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPanelLabels(!showPanelLabels)}
              className={showPanelLabels ? 'bg-primary/10' : ''}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Diagram */}
        <div className="relative border rounded-lg overflow-hidden bg-white">
          <div 
            ref={containerRef}
            className="relative cursor-crosshair"
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: `${1200 / zoom}px`,
              height: `${800 / zoom}px`
            }}
            onClick={handleImageClick}
          >
            {/* Vehicle Diagram Background */}
            <img 
              src={getVehicleImage()}
              alt={`Vehicle ${activeView.replace('_', ' ')} View`}
              className={`w-full h-full object-contain ${activeView === 'passenger_side' ? 'scale-x-[-1]' : ''}`}
              draggable={false}
            />
            
            {/* Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full opacity-20">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            )}
            
            {/* Body Panel Labels */}
            {showPanelLabels && BODY_PANELS[activeView].map(panel => (
              <div
                key={panel.id}
                className="absolute bg-white/90 text-xs px-2 py-1 rounded shadow-md pointer-events-none"
                style={{
                  left: panel.coordinates.x + panel.coordinates.width / 2,
                  top: panel.coordinates.y + panel.coordinates.height / 2,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {panel.name}
              </div>
            ))}
            
            {/* Damage Markers */}
            {currentViewDamages.map(damage => (
              <DamageMarker key={damage.id} damage={damage} />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium">Legend:</div>
          {Object.entries(DAMAGE_TYPE_STYLES).map(([type, style]) => (
            <div key={type} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: style.color }}
              >
                {style.icon}
              </div>
              <span className="text-sm">{style.label}</span>
            </div>
          ))}
        </div>

        {/* Instructions */}
        {!readOnly && (
          <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-lg border border-blue-200">
            <strong>Instructions:</strong> Click anywhere on the vehicle diagram to mark damage areas. 
            Switch between Front, Back, Top, and Side views to mark damage from all perspectives. 
            Use the zoom controls for precision marking.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessionalVehicleInspectionDiagram;