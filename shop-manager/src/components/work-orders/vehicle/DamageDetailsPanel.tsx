import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Camera, 
  DollarSign, 
  Trash2, 
  Save,
  AlertTriangle,
  MapPin,
  Clock,
  Upload
} from "lucide-react";
import { DamageArea } from "./InteractiveVehicleDamageSelector";
import { cn } from "@/lib/utils";

interface DamageDetailsPanelProps {
  damages: DamageArea[];
  selectedDamage: DamageArea | null;
  onDamageSelect: (damage: DamageArea | null) => void;
  onDamageUpdate: (damage: DamageArea) => void;
  onDamageDelete: (damageId: string) => void;
}

const damageTypes = [
  { value: 'dent', label: 'Dent', icon: '⚫', color: 'text-amber-600' },
  { value: 'scratch', label: 'Scratch', icon: '📋', color: 'text-red-600' },
  { value: 'rust', label: 'Rust', icon: '🟤', color: 'text-red-700' },
  { value: 'paint_damage', label: 'Paint Damage', icon: '🎨', color: 'text-purple-600' },
  { value: 'collision', label: 'Collision Damage', icon: '💥', color: 'text-red-700' },
  { value: 'wear', label: 'Normal Wear', icon: '⚪', color: 'text-gray-600' },
  { value: 'other', label: 'Other', icon: '❓', color: 'text-gray-600' }
];

const severityLevels = [
  { value: 'minor', label: 'Minor', color: 'bg-green-100 text-green-800', icon: '🟢' },
  { value: 'moderate', label: 'Moderate', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
  { value: 'severe', label: 'Severe', color: 'bg-red-100 text-red-800', icon: '🔴' }
];

export const DamageDetailsPanel: React.FC<DamageDetailsPanelProps> = ({
  damages,
  selectedDamage,
  onDamageSelect,
  onDamageUpdate,
  onDamageDelete
}) => {
  const [editingDamage, setEditingDamage] = useState<DamageArea | null>(null);

  const handleSave = () => {
    if (editingDamage) {
      onDamageUpdate(editingDamage);
      setEditingDamage(null);
    }
  };

  const handleCancel = () => {
    setEditingDamage(null);
  };

  const DamageListItem = ({ damage }: { damage: DamageArea }) => {
    const type = damageTypes.find(t => t.value === damage.type);
    const severity = severityLevels.find(s => s.value === damage.severity);
    
    return (
      <Card 
        className={cn(
          "cursor-pointer transition-colors duration-200 hover:bg-muted/50",
          selectedDamage?.id === damage.id && "ring-2 ring-primary bg-muted/50"
        )}
        onClick={() => onDamageSelect(damage)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{type?.icon}</span>
              <div>
                <div className="font-medium text-sm">{damage.description}</div>
                <div className="text-xs text-muted-foreground">
                  {type?.label} • {new Date(damage.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <Badge variant="outline" className={severity?.color}>
              {severity?.icon} {severity?.label}
            </Badge>
          </div>
          
          {damage.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
              {damage.notes}
            </p>
          )}
          
          {damage.estimatedCost && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              ${damage.estimatedCost.toFixed(2)} estimated
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const DamageEditForm = () => {
    if (!editingDamage) return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={editingDamage.description}
            onChange={(e) => setEditingDamage({
              ...editingDamage,
              description: e.target.value
            })}
            placeholder="Brief description of damage"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Damage Type</Label>
          <Select
            value={editingDamage.type}
            onValueChange={(value) => setEditingDamage({
              ...editingDamage,
              type: value as DamageArea['type']
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {damageTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity">Severity Level</Label>
          <Select
            value={editingDamage.severity}
            onValueChange={(value) => setEditingDamage({
              ...editingDamage,
              severity: value as DamageArea['severity']
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {severityLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center gap-2">
                    <span>{level.icon}</span>
                    <span>{level.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={editingDamage.notes || ''}
            onChange={(e) => setEditingDamage({
              ...editingDamage,
              notes: e.target.value
            })}
            placeholder="Detailed notes about the damage..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost">Estimated Repair Cost</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={editingDamage.estimatedCost || ''}
              onChange={(e) => setEditingDamage({
                ...editingDamage,
                estimatedCost: parseFloat(e.target.value) || undefined
              })}
              placeholder="0.00"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Photo Documentation</Label>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
            <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Add photos to document damage
            </p>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Photos
            </Button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} size="sm" className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button variant="outline" onClick={handleCancel} size="sm">
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Damage Areas ({damages.length})
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Click areas on vehicle to view details
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {damages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No damage areas marked</p>
              <p className="text-xs">Click "Add Damage" to start</p>
            </div>
          ) : (
            damages.map((damage) => (
              <DamageListItem key={damage.id} damage={damage} />
            ))
          )}
        </div>
      </ScrollArea>

      {selectedDamage && (
        <>
          <Separator />
          <div className="p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Damage Details</h4>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingDamage({ ...selectedDamage })}
                  disabled={!!editingDamage}
                >
                  <FileText className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDamageDelete(selectedDamage.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {editingDamage?.id === selectedDamage.id ? (
              <DamageEditForm />
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2">
                    {damageTypes.find(t => t.value === selectedDamage.type)?.label}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Severity:</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {severityLevels.find(s => s.value === selectedDamage.severity)?.label}
                  </Badge>
                </div>
                {selectedDamage.notes && (
                  <div>
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="mt-1 text-xs">{selectedDamage.notes}</p>
                  </div>
                )}
                {selectedDamage.estimatedCost && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Est. Cost:</span>
                    <span className="font-medium">${selectedDamage.estimatedCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Added {new Date(selectedDamage.createdAt).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};