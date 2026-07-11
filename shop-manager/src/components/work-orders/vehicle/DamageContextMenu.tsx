import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Edit3, 
  Trash2, 
  Copy, 
  Move3D, 
  Camera, 
  DollarSign,
  Info,
  RotateCcw
} from 'lucide-react';
import { DamageArea } from './ProfessionalVehicleInspectionDiagram';

interface DamageContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  damage: DamageArea | null;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onAddPhoto: () => void;
  onEstimateCost: () => void;
  onViewDetails: () => void;
  onClose: () => void;
}

export const DamageContextMenu: React.FC<DamageContextMenuProps> = ({
  isVisible,
  position,
  damage,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
  onAddPhoto,
  onEstimateCost,
  onViewDetails,
  onClose
}) => {
  if (!isVisible || !damage) return null;

  const menuItems = [
    { icon: Edit3, label: 'Edit Details', action: onEdit, color: 'text-blue-600' },
    { icon: Info, label: 'View Details', action: onViewDetails, color: 'text-gray-600' },
    { separator: true },
    { icon: Camera, label: 'Add Photos', action: onAddPhoto, color: 'text-green-600' },
    { icon: DollarSign, label: 'Estimate Cost', action: onEstimateCost, color: 'text-purple-600' },
    { separator: true },
    { icon: Copy, label: 'Duplicate', action: onDuplicate, color: 'text-blue-600' },
    { icon: Move3D, label: 'Move Position', action: onMove, color: 'text-yellow-600' },
    { separator: true },
    { icon: Trash2, label: 'Delete', action: onDelete, color: 'text-red-600', danger: true }
  ];

  return (
    <>
      {/* Backdrop to close menu */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Context Menu */}
      <div
        className="fixed z-50 animate-scale-in"
        style={{
          left: Math.min(position.x, window.innerWidth - 220),
          top: Math.min(position.y, window.innerHeight - 300),
        }}
      >
        <Card className="w-56 border shadow-2xl bg-white">
          <CardContent className="p-2">
            {/* Header */}
            <div className="px-2 py-1 mb-2">
              <div className="text-xs font-medium text-muted-foreground">
                {damage.description}
              </div>
              <div className="text-xs text-muted-foreground">
                {damage.type.replace('_', ' ')} • {damage.severity}
              </div>
            </div>

            {/* Menu Items */}
            {menuItems.map((item, index) => {
              if (item.separator) {
                return <Separator key={index} className="my-1" />;
              }

              const Icon = item.icon!;
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    item.action!();
                    onClose();
                  }}
                  className={`w-full justify-start h-8 px-2 ${item.danger ? 'hover:bg-red-50 hover:text-red-600' : ''}`}
                >
                  <Icon className={`h-3 w-3 mr-2 ${item.color}`} />
                  <span className="text-xs">{item.label}</span>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
};