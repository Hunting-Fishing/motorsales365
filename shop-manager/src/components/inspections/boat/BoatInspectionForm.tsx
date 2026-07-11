import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { InteractiveVesselPhoto } from './InteractiveVesselPhoto';
import { Upload, Camera, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SignatureCanvas from 'react-signature-canvas';
import vesselDiagramTemplate from '@/assets/vessel-diagram-template.jpg';

interface InspectionItem {
  id: string;
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'na';
  notes?: string;
  photoPosition?: { x: number; y: number };
}

const INSPECTION_CATEGORIES: Record<string, Array<{ id: string; label: string; position?: { x: number; y: number } }>> = {
  'Hull & Structure': [
    { id: 'hull_condition', label: 'Hull Condition', position: { x: 50, y: 70 } },
    { id: 'transom', label: 'Transom', position: { x: 85, y: 75 } },
    { id: 'deck', label: 'Deck', position: { x: 50, y: 50 } },
    { id: 'hatches', label: 'Hatches', position: { x: 40, y: 45 } },
  ],
  'Navigation Lights': [
    { id: 'port_nav_light', label: 'Port Navigation Light', position: { x: 20, y: 30 } },
    { id: 'starboard_nav_light', label: 'Starboard Navigation Light', position: { x: 80, y: 30 } },
    { id: 'stern_light', label: 'Stern Light', position: { x: 90, y: 80 } },
    { id: 'masthead_light', label: 'Masthead Light', position: { x: 50, y: 15 } },
  ],
  'Safety Equipment': [
    { id: 'life_jackets', label: 'Life Jackets / PFDs' },
    { id: 'fire_extinguisher', label: 'Fire Extinguisher' },
    { id: 'flares', label: 'Flares' },
    { id: 'horn', label: 'Horn / Sound Signal' },
  ],
  'Engine & Mechanical': [
    { id: 'engine_operation', label: 'Engine Operation', position: { x: 70, y: 60 } },
    { id: 'oil_level', label: 'Oil Level' },
    { id: 'coolant', label: 'Coolant' },
    { id: 'fuel_system', label: 'Fuel System', position: { x: 60, y: 65 } },
    { id: 'steering', label: 'Steering', position: { x: 35, y: 55 } },
  ],
  'Electrical': [
    { id: 'battery', label: 'Battery / Charging System' },
    { id: 'bilge_pump', label: 'Bilge Pump', position: { x: 45, y: 75 } },
    { id: 'navigation_electronics', label: 'Navigation Electronics', position: { x: 30, y: 35 } },
  ],
};

export function BoatInspectionForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vesselPhoto, setVesselPhoto] = useState<string>(vesselDiagramTemplate);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const signatureRef = React.useRef<SignatureCanvas>(null);

  const [formData, setFormData] = useState({
    vessel_name: '',
    vessel_type: '',
    registration_number: '',
    inspector_name: '',
    inspection_date: new Date().toISOString().split('T')[0],
    location: '',
    overall_condition: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    notes: '',
    recommendations: '',
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setVesselPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInspectionChange = (categoryId: string, itemId: string, itemLabel: string, status: 'pass' | 'fail' | 'na', notes?: string) => {
    const categoryItems = INSPECTION_CATEGORIES[categoryId as keyof typeof INSPECTION_CATEGORIES];
    const itemConfig = categoryItems?.find(item => item.id === itemId);

    setInspectionItems(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing) {
        return prev.map(i =>
          i.id === itemId ? { ...i, status, notes, photoPosition: itemConfig?.position } : i
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          category: categoryId,
          item: itemLabel,
          status,
          notes,
          photoPosition: itemConfig?.position,
        },
      ];
    });
  };

  const getAnnotations = () => {
    return inspectionItems
      .filter(item => item.photoPosition && item.status === 'fail')
      .map(item => ({
        id: item.id,
        x: item.photoPosition!.x,
        y: item.photoPosition!.y,
        label: item.item,
        status: item.status,
        notes: item.notes,
      }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const signature = signatureRef.current?.toDataURL();

      const { data, error } = await supabase.from('boat_inspections').insert({
        vessel_name: formData.vessel_name,
        vessel_type: formData.vessel_type,
        registration_number: formData.registration_number,
        inspector_name: formData.inspector_name,
        inspection_date: formData.inspection_date,
        location: formData.location,
        vessel_photos: [vesselPhoto],
        inspection_items: inspectionItems as any,
        photo_annotations: getAnnotations() as any,
        overall_condition: formData.overall_condition,
        notes: formData.notes,
        recommendations: formData.recommendations,
        inspector_signature: signature,
      } as any);

      if (error) throw error;

      toast({
        title: 'Inspection Saved',
        description: 'Boat inspection has been successfully recorded.',
      });

      // Reset form
      setInspectionItems([]);
      signatureRef.current?.clear();
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast({
        title: 'Error',
        description: 'Failed to save inspection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vessel Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vessel_name">Vessel Name</Label>
            <Input
              id="vessel_name"
              value={formData.vessel_name}
              onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
              placeholder="e.g., Sea Breeze"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vessel_type">Vessel Type</Label>
            <Input
              id="vessel_type"
              value={formData.vessel_type}
              onChange={(e) => setFormData({ ...formData, vessel_type: e.target.value })}
              placeholder="e.g., Sailboat, Motorboat"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration_number">Registration Number</Label>
            <Input
              id="registration_number"
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              placeholder="e.g., FL1234AB"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspector_name">Inspector Name</Label>
            <Input
              id="inspector_name"
              value={formData.inspector_name}
              onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspection_date">Inspection Date</Label>
            <Input
              id="inspection_date"
              type="date"
              value={formData.inspection_date}
              onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Marina or dock location"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vessel Photo / Diagram</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => document.getElementById('vessel-photo')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
              <input
                id="vessel-photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <InteractiveVesselPhoto
            imageUrl={vesselPhoto}
            annotations={getAnnotations()}
          />
        </CardContent>
      </Card>

      {Object.entries(INSPECTION_CATEGORIES).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => {
              const inspectionItem = inspectionItems.find(i => i.id === item.id);
              return (
                <div key={item.id} className="space-y-2 pb-4 border-b last:border-b-0">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">{item.label}</Label>
                    {inspectionItem?.status === 'fail' && item.position && (
                      <Badge variant="destructive" className="text-xs">
                        Highlighted on diagram
                      </Badge>
                    )}
                  </div>
                  <RadioGroup
                    value={inspectionItem?.status || ''}
                    onValueChange={(value) =>
                      handleInspectionChange(category, item.id, item.label, value as any)
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pass" id={`${item.id}-pass`} />
                      <Label htmlFor={`${item.id}-pass`} className="text-green-600 font-normal cursor-pointer">
                        Pass
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fail" id={`${item.id}-fail`} />
                      <Label htmlFor={`${item.id}-fail`} className="text-red-600 font-normal cursor-pointer">
                        Fail
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="na" id={`${item.id}-na`} />
                      <Label htmlFor={`${item.id}-na`} className="text-muted-foreground font-normal cursor-pointer">
                        N/A
                      </Label>
                    </div>
                  </RadioGroup>
                  {inspectionItem?.status && (
                    <Textarea
                      placeholder="Notes (optional)"
                      value={inspectionItem.notes || ''}
                      onChange={(e) =>
                        handleInspectionChange(category, item.id, item.label, inspectionItem.status, e.target.value)
                      }
                      className="mt-2"
                      rows={2}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Overall Vessel Condition</Label>
            <RadioGroup
              value={formData.overall_condition}
              onValueChange={(value: any) => setFormData({ ...formData, overall_condition: value })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excellent" id="excellent" />
                <Label htmlFor="excellent" className="font-normal cursor-pointer">Excellent</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="good" id="good" />
                <Label htmlFor="good" className="font-normal cursor-pointer">Good</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fair" id="fair" />
                <Label htmlFor="fair" className="font-normal cursor-pointer">Fair</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="poor" id="poor" />
                <Label htmlFor="poor" className="font-normal cursor-pointer">Poor</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">General Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional observations..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendations">Recommendations</Label>
            <Textarea
              id="recommendations"
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              placeholder="Maintenance recommendations, repairs needed..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Inspector Signature</Label>
            <div className="border rounded-lg p-2 bg-background">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: 'w-full h-32 border rounded',
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => signatureRef.current?.clear()}
              >
                Clear Signature
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" size="lg">
          Cancel
        </Button>
        <Button size="lg" onClick={handleSubmit} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Inspection'}
        </Button>
      </div>
    </div>
  );
}
