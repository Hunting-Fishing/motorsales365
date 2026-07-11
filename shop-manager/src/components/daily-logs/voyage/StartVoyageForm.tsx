import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, Anchor, Users, Package, Gauge, Fuel, Clock } from 'lucide-react';
import { VoyageType, VOYAGE_TYPE_LABELS, CrewMember } from '@/types/voyage';
import { supabase } from '@/integrations/supabase/client';
import { useVoyageLogs } from '@/hooks/useVoyageLogs';

interface StartVoyageFormProps {
  onSuccess: () => void;
}

interface FormData {
  vessel_id: string;
  departure_datetime: string;
  origin_location: string;
  destination_location: string;
  master_name: string;
  voyage_type: VoyageType;
  cargo_description: string;
  barge_name: string;
  cargo_weight: string;
  engine_hours_start: string;
  fuel_start: string;
}

export function StartVoyageForm({ onSuccess }: StartVoyageFormProps) {
  const [vessels, setVessels] = useState<{ id: string; name: string; unit_number: string | null }[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
  const { createVoyage, isCreating } = useVoyageLogs();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      departure_datetime: new Date().toISOString().slice(0, 16),
      voyage_type: 'barge_move'
    }
  });

  useEffect(() => {
    async function fetchData() {
      // Fetch vessels (marine equipment)
      const { data: vesselData } = await supabase
        .from('equipment_assets')
        .select('id, name, unit_number')
        .in('equipment_type', ['vessel', 'marine'])
        .eq('status', 'operational');
      
      if (vesselData) setVessels(vesselData);

      // Fetch crew members (profiles)
      const { data: crewData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, job_title')
        .not('first_name', 'is', null);
      
      if (crewData) {
        setCrewMembers(crewData.map(p => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          role: p.job_title || 'Crew',
          profile_id: p.id
        })));
      }

      // Auto-fill master name with current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setValue('master_name', `${profile.first_name} ${profile.last_name}`);
        }
      }
    }
    fetchData();
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    const crew = crewMembers.filter(c => selectedCrew.includes(c.id));
    
    await createVoyage({
      vessel_id: data.vessel_id || null,
      departure_datetime: data.departure_datetime,
      origin_location: data.origin_location,
      destination_location: data.destination_location,
      master_name: data.master_name,
      voyage_type: data.voyage_type,
      cargo_description: data.cargo_description || null,
      barge_name: data.barge_name || null,
      cargo_weight: data.cargo_weight ? parseFloat(data.cargo_weight) : null,
      engine_hours_start: data.engine_hours_start ? parseFloat(data.engine_hours_start) : null,
      fuel_start: data.fuel_start ? parseFloat(data.fuel_start) : null,
      crew_members: crew,
      activity_log: [{
        id: crypto.randomUUID(),
        timestamp: data.departure_datetime,
        type: 'departure',
        description: `Departed from ${data.origin_location}`,
        location: data.origin_location
      }]
    });
    onSuccess();
  };

  const toggleCrew = (crewId: string) => {
    setSelectedCrew(prev => 
      prev.includes(crewId) 
        ? prev.filter(id => id !== crewId)
        : [...prev, crewId]
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Vessel Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Vessel Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Vessel</Label>
              <Select onValueChange={v => setValue('vessel_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vessel" />
                </SelectTrigger>
                <SelectContent>
                  {vessels.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} {v.unit_number && `(${v.unit_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Master/Captain *</Label>
              <Input {...register('master_name', { required: true })} placeholder="Captain name" />
              {errors.master_name && <span className="text-destructive text-sm">Required</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Departure Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Departure Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Departure Time *</Label>
              <Input 
                type="datetime-local" 
                {...register('departure_datetime', { required: true })} 
              />
            </div>
            <div>
              <Label>Origin Location *</Label>
              <Input {...register('origin_location', { required: true })} placeholder="e.g., Wainwright Marine Dock" />
              {errors.origin_location && <span className="text-destructive text-sm">Required</span>}
            </div>
            <div>
              <Label>Destination *</Label>
              <Input {...register('destination_location', { required: true })} placeholder="e.g., Barge Site Alpha" />
              {errors.destination_location && <span className="text-destructive text-sm">Required</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voyage Type & Cargo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Voyage Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Voyage Type *</Label>
              <Select onValueChange={v => setValue('voyage_type', v as VoyageType)} defaultValue="barge_move">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VOYAGE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Barge Name (if applicable)</Label>
              <Input {...register('barge_name')} placeholder="e.g., Barge WM-001" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cargo Description</Label>
              <Textarea {...register('cargo_description')} placeholder="Describe cargo/load..." rows={2} />
            </div>
            <div>
              <Label>Cargo Weight (tonnes)</Label>
              <Input type="number" step="0.01" {...register('cargo_weight')} placeholder="0.00" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Readings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Equipment Readings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Gauge className="h-3 w-3" /> Engine Hours (Start)
            </Label>
            <Input type="number" step="0.1" {...register('engine_hours_start')} placeholder="0.0" />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Fuel className="h-3 w-3" /> Fuel Level (Start) - Litres
            </Label>
            <Input type="number" step="0.1" {...register('fuel_start')} placeholder="0.0" />
          </div>
        </CardContent>
      </Card>

      {/* Crew Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Crew Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {crewMembers.map(crew => (
              <Button
                key={crew.id}
                type="button"
                variant={selectedCrew.includes(crew.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCrew(crew.id)}
              >
                {crew.name}
              </Button>
            ))}
          </div>
          {crewMembers.length === 0 && (
            <p className="text-muted-foreground text-sm">No crew members found</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isCreating} className="gap-2">
          <Anchor className="h-4 w-4" />
          {isCreating ? 'Starting Voyage...' : 'Start Voyage'}
        </Button>
      </div>
    </form>
  );
}
