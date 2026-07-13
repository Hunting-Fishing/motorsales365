import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useForkliftInspections, ItemStatus } from '@/hooks/useForkliftInspections';
import { useMaintenanceIntervalTracking } from '@/hooks/useMaintenanceIntervalTracking';
import { supabase } from '@/integrations/supabase/client';
import { ForkliftInspectionItem } from './ForkliftInspectionItem';
import { ServiceIntervalCountdown } from './ServiceIntervalCountdown';
import { CompactSignaturePad } from '@/components/signature/CompactSignaturePad';
import {
  Loader2, Forklift, Gauge, Armchair, Siren, Eye, Wrench, 
  Battery, Flame, Droplets, Wind, Shield, AlertTriangle, PenTool
} from 'lucide-react';

interface EquipmentAsset {
  id: string;
  name: string;
  asset_number: string;
  current_hours: number;
  equipment_type: string;
}

interface ForkliftInspectionFormProps {
  workOrderId?: string;
}

const INSPECTION_ITEMS = [
  { key: 'seat', label: 'Seat', icon: <Armchair className="h-4 w-4" /> },
  { key: 'seatbelt', label: 'Seatbelt', icon: <Shield className="h-4 w-4" /> },
  { key: 'steering', label: 'Steering', icon: <Forklift className="h-4 w-4" /> },
  { key: 'horn', label: 'Horn', icon: <Siren className="h-4 w-4" /> },
  { key: 'lights', label: 'Lights', icon: <Eye className="h-4 w-4" /> },
  { key: 'backup_alarm', label: 'Backup Alarm', icon: <Siren className="h-4 w-4" /> },
  { key: 'mirrors', label: 'Mirrors', icon: <Eye className="h-4 w-4" /> },
  { key: 'forks', label: 'Forks', icon: <Forklift className="h-4 w-4" /> },
  { key: 'mast', label: 'Mast', icon: <Forklift className="h-4 w-4" /> },
  { key: 'chains', label: 'Chains', icon: <Wrench className="h-4 w-4" /> },
  { key: 'hydraulic_leaks', label: 'Hydraulic Leaks', icon: <Droplets className="h-4 w-4" /> },
  { key: 'tires', label: 'Tires', icon: <Gauge className="h-4 w-4" /> },
  { key: 'brakes', label: 'Brakes', icon: <Shield className="h-4 w-4" /> },
  { key: 'parking_brake', label: 'Parking Brake', icon: <Shield className="h-4 w-4" /> },
  { key: 'battery', label: 'Battery', icon: <Battery className="h-4 w-4" /> },
  { key: 'propane_tank', label: 'Propane Tank', icon: <Flame className="h-4 w-4" /> },
  { key: 'engine_oil', label: 'Engine Oil', icon: <Droplets className="h-4 w-4" /> },
  { key: 'coolant', label: 'Coolant', icon: <Droplets className="h-4 w-4" /> },
  { key: 'air_filter', label: 'Air Filter', icon: <Wind className="h-4 w-4" /> },
  { key: 'fire_extinguisher', label: 'Fire Extinguisher', icon: <Flame className="h-4 w-4" /> },
];

export function ForkliftInspectionForm({ workOrderId: propWorkOrderId }: ForkliftInspectionFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { createInspection, loading: submitting } = useForkliftInspections();
  
  // Get workOrderId from props or URL query params
  const workOrderId = propWorkOrderId || searchParams.get('workOrderId') || undefined;
  const equipmentIdFromUrl = searchParams.get('equipmentId');
  
  const [equipment, setEquipment] = useState<EquipmentAsset[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  
  const { intervals } = useMaintenanceIntervalTracking(selectedEquipmentId);
  
  const [formData, setFormData] = useState<{
    inspector_name: string;
    current_hours: string;
    general_notes: string;
    safe_to_operate: boolean;
    signature_data: string | null;
    [key: string]: any;
  }>({
    inspector_name: '',
    current_hours: '',
    general_notes: '',
    safe_to_operate: true,
    signature_data: null,
  });

  // Auto-fill inspector name from current user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (profile && (profile.first_name || profile.last_name)) {
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
        setFormData(prev => ({ ...prev, inspector_name: fullName }));
      }
    };
    fetchUserProfile();
  }, []);

  // Initialize all inspection items with null status (no selection)
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>(() => {
    const initial: Record<string, ItemStatus> = {};
    INSPECTION_ITEMS.forEach(item => {
      initial[item.key] = null;
    });
    return initial;
  });

  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemPhotos, setItemPhotos] = useState<Record<string, string[]>>({});

  // Fetch forklift equipment
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();

        if (!profile?.shop_id) return;

        const { data, error } = await supabase
          .from('equipment_assets')
          .select('id, name, asset_number, current_hours, equipment_type')
          .eq('shop_id', profile.shop_id)
          .in('equipment_type', ['forklift', 'lifting', 'other']);

        if (error) throw error;
        setEquipment((data || []) as EquipmentAsset[]);
      } catch (error) {
        console.error('Error fetching equipment:', error);
      } finally {
        setLoadingEquipment(false);
      }
    };

    fetchEquipment();
  }, []);

  // Auto-select equipment from URL params
  useEffect(() => {
    if (equipmentIdFromUrl && equipment.length > 0 && !selectedEquipmentId) {
      const matchingEquipment = equipment.find(e => e.id === equipmentIdFromUrl);
      if (matchingEquipment) {
        setSelectedEquipmentId(equipmentIdFromUrl);
      }
    }
  }, [equipmentIdFromUrl, equipment, selectedEquipmentId]);

  // Update current hours when equipment selected
  useEffect(() => {
    if (selectedEquipmentId) {
      const selected = equipment.find(e => e.id === selectedEquipmentId);
      if (selected?.current_hours) {
        setFormData(prev => ({ ...prev, current_hours: String(selected.current_hours) }));
      }
    }
  }, [selectedEquipmentId, equipment]);

  const handleStatusChange = (key: string, status: ItemStatus) => {
    setItemStatuses(prev => ({ ...prev, [key]: status }));
    // Clear notes and photos if status is good or na
    if (status === 'good' || status === 'na') {
      setItemNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[key];
        return newNotes;
      });
    }
  };

  const handleNotesChange = (key: string, notes: string) => {
    setItemNotes(prev => ({ ...prev, [key]: notes }));
  };

  const handlePhotosChange = (key: string, photos: string[]) => {
    setItemPhotos(prev => ({ ...prev, [key]: photos }));
  };

  const hasConcerns = Object.values(itemStatuses).some(status => status !== 'good' && status !== 'na' && status !== null);
  const hasBadItems = Object.values(itemStatuses).some(status => status === 'bad');

  const calculateOverallStatus = () => {
    if (hasBadItems || !formData.safe_to_operate) return 'fail';
    if (hasConcerns) return 'pass_with_concerns';
    return 'pass';
  };

  // Check if all items have been inspected
  const allItemsInspected = Object.values(itemStatuses).every(status => status !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEquipmentId || !formData.inspector_name || !formData.current_hours) {
      toast({
        variant: 'destructive',
        title: 'Missing Required Fields',
        description: 'Please fill in all required fields',
      });
      return;
    }

    if (!allItemsInspected) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Inspection',
        description: 'Please inspect all items before submitting',
      });
      return;
    }

    if (!formData.signature_data) {
      toast({
        variant: 'destructive',
        title: 'Signature Required',
        description: 'Please sign the inspection form',
      });
      return;
    }

    const inspectionData: Record<string, any> = {
      equipment_id: selectedEquipmentId,
      inspector_name: formData.inspector_name,
      current_hours: parseFloat(formData.current_hours),
      general_notes: formData.general_notes || null,
      safe_to_operate: formData.safe_to_operate,
      overall_status: calculateOverallStatus(),
      signature_data: formData.signature_data,
      work_order_id: workOrderId || null,
      item_photos: itemPhotos, // Store all item photos as JSONB
    };

    // Add all status and notes fields
    INSPECTION_ITEMS.forEach(item => {
      inspectionData[`${item.key}_status`] = itemStatuses[item.key] || 'na';
      if (itemNotes[item.key]) {
        inspectionData[`${item.key}_notes`] = itemNotes[item.key];
      }
    });

    try {
      await createInspection(inspectionData as any);
      navigate('/safety/equipment');
    } catch (error) {
      // Error handled in hook
    }
  };

  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Work Order Link Badge */}
      {workOrderId && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-blue-500 text-blue-600">
                Linked to Work Order
              </Badge>
              <span className="text-sm text-muted-foreground">
                This inspection will be associated with work order #{workOrderId.slice(0, 8)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Forklift className="h-5 w-5" />
            Forklift Inspection
          </CardTitle>
          <CardDescription>
            Daily pre-operation inspection checklist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Select Equipment *</Label>
              {loadingEquipment ? (
                <div className="flex items-center gap-2 p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select forklift" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.asset_number || 'No #'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector_name">Inspector Name *</Label>
              <Input
                id="inspector_name"
                value={formData.inspector_name}
                onChange={(e) => setFormData(prev => ({ ...prev, inspector_name: e.target.value }))}
                placeholder="Your name"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current_hours">Current Hours *</Label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="current_hours"
                  type="number"
                  step="0.1"
                  value={formData.current_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_hours: e.target.value }))}
                  className="pl-10"
                  placeholder="0.0"
                  required
                />
              </div>
            </div>
            
            {selectedEquipment && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Previous Reading</p>
                <p className="font-semibold">
                  {selectedEquipment.current_hours?.toLocaleString() || 0} hours
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Interval Countdown */}
      {selectedEquipmentId && intervals.length > 0 && (
        <ServiceIntervalCountdown 
          intervals={intervals} 
          currentHours={parseFloat(formData.current_hours) || selectedEquipment?.current_hours || 0}
        />
      )}

      {/* Inspection Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Checklist</CardTitle>
          <CardDescription>
            Tap the status button for each item: 
            <span className="text-green-600 font-medium"> Green = Good</span>, 
            <span className="text-amber-600 font-medium"> Yellow = Needs Attention</span>, 
            <span className="text-red-600 font-medium"> Red = Bad</span>,
            <span className="text-gray-500 font-medium"> Gray = N/A</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {INSPECTION_ITEMS.map((item) => (
            <ForkliftInspectionItem
              key={item.key}
              label={item.label}
              itemKey={item.key}
              value={itemStatuses[item.key]}
              notes={itemNotes[item.key]}
              photos={itemPhotos[item.key] || []}
              onChange={handleStatusChange}
              onNotesChange={handleNotesChange}
              onPhotosChange={handlePhotosChange}
              icon={item.icon}
            />
          ))}
        </CardContent>
      </Card>

      {/* Safety Determination */}
      <Card>
        <CardHeader>
          <CardTitle>Safety Determination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-base">Safe to Operate</Label>
              <p className="text-sm text-muted-foreground">Can this forklift be safely operated?</p>
            </div>
            <Switch
              checked={formData.safe_to_operate}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, safe_to_operate: checked }))}
            />
          </div>

          {hasConcerns && (
            <div className={`p-4 rounded-lg border ${hasBadItems ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`h-5 w-5 ${hasBadItems ? 'text-red-500' : 'text-amber-500'}`} />
                <div>
                  <p className={`text-sm font-medium ${hasBadItems ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    {hasBadItems 
                      ? 'Critical issues found - Equipment may need to be taken out of service'
                      : 'Issues require attention - Inspection will be routed to manager'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>General Notes</Label>
            <Textarea
              placeholder="Additional observations..."
              value={formData.general_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, general_notes: e.target.value }))}
            />
          </div>

          {/* Signature Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Inspector Signature *
            </Label>
            <CompactSignaturePad
              value={formData.signature_data || undefined}
              onChange={(sig) => setFormData(prev => ({ ...prev, signature_data: sig }))}
              required
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">Overall Status:</span>
            <Badge variant={
              calculateOverallStatus() === 'pass' ? 'default' : 
              calculateOverallStatus() === 'pass_with_concerns' ? 'secondary' : 'destructive'
            }>
              {calculateOverallStatus() === 'pass' ? 'Pass' : 
               calculateOverallStatus() === 'pass_with_concerns' ? 'Pass with Concerns' : 'Fail'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => navigate('/safety/equipment')}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={submitting || !selectedEquipmentId || !formData.inspector_name || !formData.current_hours}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            'Submit Inspection'
          )}
        </Button>
      </div>
    </form>
  );
}
