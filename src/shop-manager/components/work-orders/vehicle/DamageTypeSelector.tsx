import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';

interface DamageTypeOption {
  value: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

interface DamageTypeFloatingToolbarProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedType: string;
  selectedSeverity: string;
  onTypeSelect: (type: string) => void;
  onSeveritySelect: (severity: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const DAMAGE_TYPES: DamageTypeOption[] = [
  { value: 'dent', label: 'Dent', icon: '●', color: 'bg-amber-500', description: 'Impact depression' },
  { value: 'scratch', label: 'Scratch', icon: '╱', color: 'bg-red-500', description: 'Surface scratch' },
  { value: 'rust', label: 'Rust', icon: '◆', color: 'bg-red-700', description: 'Corrosion damage' },
  { value: 'paint_damage', label: 'Paint', icon: '◐', color: 'bg-purple-500', description: 'Paint chipping' },
  { value: 'collision', label: 'Collision', icon: '✶', color: 'bg-red-800', description: 'Crash damage' },
  { value: 'wear', label: 'Wear', icon: '○', color: 'bg-gray-500', description: 'Normal wear' },
  { value: 'other', label: 'Other', icon: '?', color: 'bg-gray-600', description: 'Other damage' }
];

const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor', color: 'bg-green-500', size: 'small' },
  { value: 'moderate', label: 'Moderate', color: 'bg-yellow-500', size: 'medium' },
  { value: 'severe', label: 'Severe', color: 'bg-red-500', size: 'large' }
];

export const DamageTypeFloatingToolbar: React.FC<DamageTypeFloatingToolbarProps> = ({
  isVisible,
  position,
  selectedType,
  selectedSeverity,
  onTypeSelect,
  onSeveritySelect,
  onConfirm,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed z-50 animate-scale-in"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 280),
      }}
    >
      <Card className="w-80 border-2 border-primary shadow-2xl bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Select Damage Type</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Damage Type Selection */}
          <div className="space-y-2 mb-4">
            <div className="text-xs font-medium text-muted-foreground">Damage Type:</div>
            <div className="grid grid-cols-2 gap-2">
              {DAMAGE_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onTypeSelect(type.value)}
                  className="justify-start h-8 text-xs"
                >
                  <span className={`w-3 h-3 rounded-full ${type.color} mr-2 flex items-center justify-center text-white text-xs`}>
                    {type.icon}
                  </span>
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="my-3" />

          {/* Severity Selection */}
          <div className="space-y-2 mb-4">
            <div className="text-xs font-medium text-muted-foreground">Severity Level:</div>
            <div className="flex gap-2">
              {SEVERITY_LEVELS.map((severity) => (
                <Button
                  key={severity.value}
                  variant={selectedSeverity === severity.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSeveritySelect(severity.value)}
                  className="flex-1 h-8 text-xs"
                >
                  <div className={`w-2 h-2 rounded-full ${severity.color} mr-1`} />
                  {severity.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected Preview */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="text-xs text-muted-foreground mb-1">Preview:</div>
            <div className="flex items-center gap-2">
              <div 
                className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${DAMAGE_TYPES.find(t => t.value === selectedType)?.color || 'bg-gray-400'}`}
              >
                {DAMAGE_TYPES.find(t => t.value === selectedType)?.icon || '?'}
              </div>
              <span className="text-sm font-medium">
                {DAMAGE_TYPES.find(t => t.value === selectedType)?.label || 'Unknown'} - {SEVERITY_LEVELS.find(s => s.value === selectedSeverity)?.label || 'Unknown'}
              </span>
              <Badge variant="outline" className="text-xs">
                {DAMAGE_TYPES.find(t => t.value === selectedType)?.description || 'Unknown damage'}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={onConfirm} size="sm" className="flex-1">
              Place Damage
            </Button>
            <Button onClick={onCancel} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};