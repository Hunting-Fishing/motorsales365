import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, TrendingUp, TrendingDown, Minus, Save, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  clientId: string;
  clientHeightCm?: number;
  latestMetrics?: any;
}

export function QuickLogPanel({ clientId, clientHeightCm, latestMetrics }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');

  const quickLog = useMutation({
    mutationFn: async () => {
      const payload: any = {
        client_id: clientId,
        recorded_date: new Date().toISOString().split('T')[0],
        source: 'manual',
      };
      if (weight) {
        payload.weight_kg = parseFloat(weight);
        if (clientHeightCm) {
          const heightM = clientHeightCm / 100;
          payload.bmi = Math.round((parseFloat(weight) / (heightM * heightM)) * 10) / 10;
        }
      }
      if (heartRate) payload.resting_heart_rate = parseInt(heartRate);
      if (bodyFat) payload.body_fat_percent = parseFloat(bodyFat);
      if (bpSys) payload.blood_pressure_systolic = parseInt(bpSys);
      if (bpDia) payload.blood_pressure_diastolic = parseInt(bpDia);

      if (Object.keys(payload).length <= 3) throw new Error('Enter at least one measurement');

      const { error } = await (supabase as any).from('pt_body_metrics').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-metrics'] });
      toast({ title: 'Quick log saved!' });
      setWeight('');
      setHeartRate('');
      setBodyFat('');
      setBpSys('');
      setBpDia('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const trend = (current: string, field: string) => {
    if (!current || !latestMetrics?.[field]) return null;
    const diff = parseFloat(current) - latestMetrics[field];
    if (Math.abs(diff) < 0.1) return <Minus className="h-3 w-3 text-muted-foreground" />;
    return diff > 0
      ? <TrendingUp className="h-3 w-3 text-destructive" />
      : <TrendingDown className="h-3 w-3 text-primary" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Quick Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs flex items-center gap-1">
              Weight (kg) {trend(weight, 'weight_kg')}
            </Label>
            <Input type="number" step="0.1" placeholder={latestMetrics?.weight_kg?.toString() || '—'} value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              Body Fat % {trend(bodyFat, 'body_fat_percent')}
            </Label>
            <Input type="number" step="0.1" placeholder={latestMetrics?.body_fat_percent?.toString() || '—'} value={bodyFat} onChange={e => setBodyFat(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              Heart Rate {trend(heartRate, 'resting_heart_rate')}
            </Label>
            <Input type="number" step="1" placeholder={latestMetrics?.resting_heart_rate?.toString() || '—'} value={heartRate} onChange={e => setHeartRate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Blood Pressure</Label>
            <div className="flex gap-1">
              <Input type="number" step="1" placeholder="sys" value={bpSys} onChange={e => setBpSys(e.target.value)} className="w-1/2" />
              <Input type="number" step="1" placeholder="dia" value={bpDia} onChange={e => setBpDia(e.target.value)} className="w-1/2" />
            </div>
          </div>
        </div>
        <Button size="sm" className="w-full" onClick={() => quickLog.mutate()} disabled={quickLog.isPending || (!weight && !heartRate && !bodyFat && !bpSys)}>
          {quickLog.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Save Quick Log
        </Button>
      </CardContent>
    </Card>
  );
}
