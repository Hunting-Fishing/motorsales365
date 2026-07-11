import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Plus } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { BodyMetricsInfoPopover } from '@/components/personal-trainer/metrics/BodyMetricsInfoPopover';
import { BMIScaleCard } from '@/components/personal-trainer/metrics/BMIScaleCard';
import { HealthDeviceCard } from '@/components/personal-trainer/metrics/HealthDeviceCard';
import { EnhancedMetricCard } from '@/components/personal-trainer/metrics/EnhancedMetricCard';
const BluetoothDevicePanel = React.lazy(() => import('@/components/personal-trainer/metrics/BluetoothDevicePanel').then(m => ({ default: m.BluetoothDevicePanel })));
const QuickLogPanel = React.lazy(() => import('@/components/personal-trainer/metrics/QuickLogPanel').then(m => ({ default: m.QuickLogPanel })));
import { calculateBMI } from '@/components/personal-trainer/metrics/BMIBadge';
import type { BLEReading } from '@/hooks/useBLEDevice';

export default function PersonalTrainerMetrics() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [formTab, setFormTab] = useState('composition');
  const [form, setForm] = useState({
    client_id: '', recorded_date: new Date().toISOString().split('T')[0],
    weight_kg: '', body_fat_percent: '', chest_cm: '', waist_cm: '', hips_cm: '', arm_cm: '', thigh_cm: '',
    muscle_mass_kg: '', bone_mass_kg: '', water_percent: '', visceral_fat: '',
    resting_heart_rate: '', blood_pressure_systolic: '', blood_pressure_diastolic: '', bmr_calories: '',
    source: 'manual', notes: '',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-clients-list', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients').select('id, first_name, last_name, height_cm').eq('shop_id', shopId).order('first_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['pt-metrics', shopId, selectedClient],
    queryFn: async () => {
      if (!shopId) return [];
      let q = (supabase as any).from('pt_body_metrics').select('*, pt_clients(first_name, last_name, height_cm)');
      if (selectedClient) q = q.eq('client_id', selectedClient);
      else {
        const { data: shopClients } = await (supabase as any).from('pt_clients').select('id').eq('shop_id', shopId);
        if (!shopClients?.length) return [];
        q = q.in('client_id', shopClients.map((c: any) => c.id));
      }
      const { data } = await q.order('recorded_date', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: healthIntegrations = [] } = useQuery({
    queryKey: ['pt-health-integrations', shopId, selectedClient],
    queryFn: async () => {
      if (!shopId || !selectedClient) return [];
      const { data } = await (supabase as any).from('pt_health_integrations').select('*').eq('client_id', selectedClient).eq('shop_id', shopId);
      return data || [];
    },
    enabled: !!shopId && !!selectedClient,
  });

  const selectedClientData = useMemo(() => clients.find((c: any) => c.id === selectedClient), [clients, selectedClient]);
  const formClientData = useMemo(() => clients.find((c: any) => c.id === form.client_id), [clients, form.client_id]);

  const latestBMI = useMemo(() => {
    if (!metrics.length) return null;
    const latest = metrics[0];
    if (latest?.bmi) return latest.bmi;
    if (latest?.weight_kg && latest?.pt_clients?.height_cm) {
      return calculateBMI(latest.weight_kg, latest.pt_clients.height_cm);
    }
    return null;
  }, [metrics]);

  const autoBMI = useMemo(() => {
    if (!form.weight_kg || !formClientData?.height_cm) return null;
    return calculateBMI(parseFloat(form.weight_kg), formClientData.height_cm);
  }, [form.weight_kg, formClientData]);

  const addMetric = useMutation({
    mutationFn: async () => {
      const payload: any = { client_id: form.client_id, recorded_date: form.recorded_date, notes: form.notes || null, source: form.source };
      const numFields = ['weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hips_cm', 'arm_cm', 'thigh_cm', 'muscle_mass_kg', 'bone_mass_kg', 'water_percent', 'visceral_fat'] as const;
      const intFields = ['resting_heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'bmr_calories'] as const;
      numFields.forEach(f => { if ((form as any)[f]) payload[f] = parseFloat((form as any)[f]); });
      intFields.forEach(f => { if ((form as any)[f]) payload[f] = parseInt((form as any)[f]); });
      if (autoBMI) payload.bmi = Math.round(autoBMI * 10) / 10;
      const { error } = await (supabase as any).from('pt_body_metrics').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-metrics'] });
      toast({ title: 'Metrics recorded' });
      setDialogOpen(false);
      setForm({ client_id: '', recorded_date: new Date().toISOString().split('T')[0], weight_kg: '', body_fat_percent: '', chest_cm: '', waist_cm: '', hips_cm: '', arm_cm: '', thigh_cm: '', muscle_mass_kg: '', bone_mass_kg: '', water_percent: '', visceral_fat: '', resting_heart_rate: '', blood_pressure_systolic: '', blood_pressure_diastolic: '', bmr_calories: '', source: 'manual', notes: '' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const f = (key: string) => ({
    type: 'number' as const, step: '0.1',
    value: (form as any)[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-2xl font-bold">Body Metrics</h1>
              <BodyMetricsInfoPopover />
            </div>
            <p className="text-muted-foreground text-sm">Track client body composition, vitals & health data</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"><Plus className="h-4 w-4 mr-2" />Record Metrics</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Body Metrics</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={form.client_id} onValueChange={v => setForm(prev => ({ ...prev, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><Label>Date</Label><Input type="date" value={form.recorded_date} onChange={e => setForm(prev => ({ ...prev, recorded_date: e.target.value }))} /></div>
                <div className="flex-1">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm(prev => ({ ...prev, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="apple_health">Apple Health</SelectItem>
                      <SelectItem value="google_fit">Google Fit</SelectItem>
                      <SelectItem value="fitbit">Fitbit</SelectItem>
                      <SelectItem value="smart_scale">Smart Scale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto BMI display */}
              {autoBMI && (
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <span className="text-xs text-muted-foreground">Calculated BMI</span>
                  <p className="text-lg font-bold text-primary">{autoBMI.toFixed(1)}</p>
                </div>
              )}
              {form.weight_kg && formClientData && !formClientData.height_cm && (
                <p className="text-xs text-amber-600">Add height to client profile for automatic BMI calculation.</p>
              )}

              <Tabs value={formTab} onValueChange={setFormTab}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="composition">Composition</TabsTrigger>
                  <TabsTrigger value="measurements">Measurements</TabsTrigger>
                  <TabsTrigger value="vitals">Vitals</TabsTrigger>
                </TabsList>
                <TabsContent value="composition" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Weight (kg)</Label><Input {...f('weight_kg')} /></div>
                    <div><Label>Body Fat %</Label><Input {...f('body_fat_percent')} /></div>
                    <div><Label>Muscle Mass (kg)</Label><Input {...f('muscle_mass_kg')} /></div>
                    <div><Label>Bone Mass (kg)</Label><Input {...f('bone_mass_kg')} /></div>
                    <div><Label>Water %</Label><Input {...f('water_percent')} /></div>
                    <div><Label>Visceral Fat</Label><Input {...f('visceral_fat')} /></div>
                  </div>
                </TabsContent>
                <TabsContent value="measurements" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Chest (cm)</Label><Input {...f('chest_cm')} /></div>
                    <div><Label>Waist (cm)</Label><Input {...f('waist_cm')} /></div>
                    <div><Label>Hips (cm)</Label><Input {...f('hips_cm')} /></div>
                    <div><Label>Arm (cm)</Label><Input {...f('arm_cm')} /></div>
                    <div><Label>Thigh (cm)</Label><Input {...f('thigh_cm')} /></div>
                  </div>
                </TabsContent>
                <TabsContent value="vitals" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Resting Heart Rate (bpm)</Label><Input type="number" step="1" value={form.resting_heart_rate} onChange={e => setForm(prev => ({ ...prev, resting_heart_rate: e.target.value }))} /></div>
                    <div><Label>BMR (calories)</Label><Input type="number" step="1" value={form.bmr_calories} onChange={e => setForm(prev => ({ ...prev, bmr_calories: e.target.value }))} /></div>
                    <div><Label>BP Systolic (mmHg)</Label><Input type="number" step="1" value={form.blood_pressure_systolic} onChange={e => setForm(prev => ({ ...prev, blood_pressure_systolic: e.target.value }))} /></div>
                    <div><Label>BP Diastolic (mmHg)</Label><Input type="number" step="1" value={form.blood_pressure_diastolic} onChange={e => setForm(prev => ({ ...prev, blood_pressure_diastolic: e.target.value }))} /></div>
                  </div>
                </TabsContent>
              </Tabs>

              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Optional notes..." /></div>

              <Button className="w-full" disabled={!form.client_id || addMetric.isPending} onClick={() => addMetric.mutate()}>
                {addMetric.isPending ? 'Recording...' : 'Record Metrics'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Client filter */}
      <div className="max-w-xs">
        <Select value={selectedClient || '__all__'} onValueChange={v => setSelectedClient(v === '__all__' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="All clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Clients</SelectItem>
            {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bluetooth + Quick Log + Health Devices + BMI */}
      {selectedClient && (
        <Suspense fallback={<div className="text-muted-foreground text-sm">Loading...</div>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BluetoothDevicePanel onReadingReceived={(reading: BLEReading) => {
            // Auto-save BLE readings as metrics
            const payload: any = {
              client_id: selectedClient,
              recorded_date: new Date().toISOString().split('T')[0],
              source: 'bluetooth',
            };
            if (reading.heartRate) payload.resting_heart_rate = reading.heartRate;
            if (reading.weightKg) {
              payload.weight_kg = reading.weightKg;
              if (selectedClientData?.height_cm) {
                payload.bmi = Math.round(calculateBMI(reading.weightKg, selectedClientData.height_cm) * 10) / 10;
              }
            }
            if (reading.bodyFatPercent) payload.body_fat_percent = reading.bodyFatPercent;
            if (Object.keys(payload).length > 3) {
              (supabase as any).from('pt_body_metrics').insert(payload).then(() => {
                queryClient.invalidateQueries({ queryKey: ['pt-metrics'] });
              });
            }
          }} />
          <QuickLogPanel
            clientId={selectedClient}
            clientHeightCm={selectedClientData?.height_cm}
            latestMetrics={metrics[0]}
          />
          <BMIScaleCard currentBMI={latestBMI} />
        </div>
        </Suspense>
      )}
      {selectedClient && (
        <HealthDeviceCard integrations={healthIntegrations} clientId={selectedClient} />
      )}

      {/* Metrics list */}
      {isLoading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
      ) : metrics.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><Activity className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No metrics recorded yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {metrics.map((m: any, idx: number) => (
            <EnhancedMetricCard key={m.id} metric={m} previousMetric={metrics[idx + 1]} />
          ))}
        </div>
      )}
    </div>
  );
}
