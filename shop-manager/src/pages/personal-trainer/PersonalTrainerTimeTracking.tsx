import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClockInOutCard } from '@/components/personal-trainer/business/ClockInOutCard';
import { ShiftLogTable } from '@/components/personal-trainer/business/ShiftLogTable';
import { WeeklyHoursSummary } from '@/components/personal-trainer/business/WeeklyHoursSummary';
import { toast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, format, differenceInMinutes } from 'date-fns';
import { LogIn, Clock } from 'lucide-react';

export default function PersonalTrainerTimeTracking() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const { data: staff } = useQuery({
    queryKey: ['pt-gym-staff', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from('pt_gym_staff').select('*').eq('shop_id', shopId).eq('is_active', true).order('first_name');
      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
  });

  const { data: timeEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['pt-time-entries', shopId, weekStart.toISOString()],
    queryFn: async () => {
      if (!shopId) return [];
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const { data, error } = await supabase
        .from('pt_time_entries')
        .select('*, pt_gym_staff(first_name, last_name, hourly_rate)')
        .eq('shop_id', shopId)
        .gte('clock_in', weekStart.toISOString())
        .lte('clock_in', weekEnd.toISOString())
        .order('clock_in', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
  });

  const { data: activeEntries } = useQuery({
    queryKey: ['pt-time-entries-active', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('pt_time_entries')
        .select('*, pt_gym_staff(first_name, last_name)')
        .eq('shop_id', shopId)
        .eq('status', 'active')
        .is('clock_out', null);
      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
    refetchInterval: 30000,
  });

  const activeShifts = useMemo(() =>
    (activeEntries || []).map((e: any) => ({
      id: e.id,
      staff_name: e.pt_gym_staff ? `${e.pt_gym_staff.first_name} ${e.pt_gym_staff.last_name}` : 'Unknown',
      clock_in: e.clock_in,
      staff_id: e.staff_id,
    })), [activeEntries]
  );

  const shiftLog = useMemo(() =>
    (timeEntries || []).map((e: any) => ({
      id: e.id,
      staff_name: e.pt_gym_staff ? `${e.pt_gym_staff.first_name} ${e.pt_gym_staff.last_name}` : 'Unknown',
      clock_in: e.clock_in,
      clock_out: e.clock_out,
      break_minutes: e.break_minutes || 0,
      total_hours: e.total_hours,
      status: e.status,
      notes: e.notes,
    })), [timeEntries]
  );

  const weeklySummaries = useMemo(() => {
    if (!timeEntries || !staff) return [];
    const map: Record<string, { hours: number; shifts: number; rate: number; name: string }> = {};
    timeEntries.forEach((e: any) => {
      if (!e.staff_id || !e.total_hours) return;
      if (!map[e.staff_id]) {
        const s = e.pt_gym_staff;
        map[e.staff_id] = { hours: 0, shifts: 0, rate: Number(s?.hourly_rate || 0), name: s ? `${s.first_name} ${s.last_name}` : 'Unknown' };
      }
      map[e.staff_id].hours += Number(e.total_hours);
      map[e.staff_id].shifts += 1;
    });
    return Object.values(map).map(s => ({
      name: s.name,
      totalHours: s.hours,
      hourlyRate: s.rate,
      totalPay: s.hours * s.rate,
      shifts: s.shifts,
    }));
  }, [timeEntries, staff]);

  const handleClockIn = async () => {
    if (!shopId || !selectedStaffId) return;
    setClockingIn(true);
    try {
      const { error } = await supabase.from('pt_time_entries').insert({
        shop_id: shopId,
        staff_id: selectedStaffId,
        clock_in: new Date().toISOString(),
        status: 'active',
      });
      if (error) throw error;
      toast({ title: 'Clocked in successfully' });
      queryClient.invalidateQueries({ queryKey: ['pt-time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['pt-time-entries-active'] });
      setSelectedStaffId('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async (entryId: string) => {
    setClockingOut(true);
    try {
      const { data: entry } = await supabase.from('pt_time_entries').select('clock_in, break_minutes').eq('id', entryId).single();
      if (!entry) throw new Error('Entry not found');
      const totalMinutes = differenceInMinutes(new Date(), new Date(entry.clock_in)) - (entry.break_minutes || 0);
      const totalHours = Math.max(0, totalMinutes / 60);

      const { error } = await supabase.from('pt_time_entries').update({
        clock_out: new Date().toISOString(),
        total_hours: parseFloat(totalHours.toFixed(2)),
        status: 'completed',
      }).eq('id', entryId);
      if (error) throw error;
      toast({ title: 'Clocked out successfully' });
      queryClient.invalidateQueries({ queryKey: ['pt-time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['pt-time-entries-active'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setClockingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Time Tracking</h1>
        <p className="text-sm text-muted-foreground">Clock in/out staff and track hours worked</p>
      </div>

      {/* Clock In Section */}
      <div className="flex flex-col sm:flex-row items-end gap-3 p-4 rounded-xl border bg-card">
        <div className="flex-1 space-y-2 w-full">
          <Label>Select Staff Member</Label>
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger><SelectValue placeholder="Choose staff..." /></SelectTrigger>
            <SelectContent>
              {staff?.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleClockIn} disabled={!selectedStaffId || clockingIn} className="gap-2">
          <LogIn className="h-4 w-4" /> {clockingIn ? 'Clocking In...' : 'Clock In'}
        </Button>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5"><Clock className="h-4 w-4" /> Active Shifts ({activeShifts.length})</TabsTrigger>
          <TabsTrigger value="log">Shift Log</TabsTrigger>
          <TabsTrigger value="summary">Weekly Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ClockInOutCard activeShifts={activeShifts} onClockOut={handleClockOut} clockingOut={clockingOut} />
        </TabsContent>

        <TabsContent value="log" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>Week of:</Label>
            <Input
              type="date"
              value={format(weekStart, 'yyyy-MM-dd')}
              onChange={e => {
                const d = new Date(e.target.value);
                setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
              }}
              className="w-auto"
            />
          </div>
          <ShiftLogTable entries={shiftLog} isLoading={entriesLoading} />
        </TabsContent>

        <TabsContent value="summary">
          <WeeklyHoursSummary summaries={weeklySummaries} isLoading={entriesLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
