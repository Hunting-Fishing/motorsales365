import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  MapPin,
  Coffee,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, differenceInSeconds } from 'date-fns';

interface TimeEntry {
  id: string;
  job_id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
}

interface TimeClockWidgetProps {
  jobId: string;
  shopId: string;
  onTimeUpdate?: () => void;
}

export function TimeClockWidget({ jobId, shopId, onTimeUpdate }: TimeClockWidgetProps) {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [notes, setNotes] = useState('');

  // Fetch time entries
  useEffect(() => {
    fetchEntries();
  }, [jobId]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeEntry && !activeEntry.clock_out) {
      interval = setInterval(() => {
        const elapsed = differenceInSeconds(new Date(), new Date(activeEntry.clock_in));
        setElapsedSeconds(elapsed - (activeEntry.break_minutes * 60));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('power_washing_time_entries')
        .select('*')
        .eq('job_id', jobId)
        .order('clock_in', { ascending: false });

      if (error) throw error;
      
      setEntries(data || []);
      const active = data?.find(e => !e.clock_out);
      setActiveEntry(active || null);
    } catch (error) {
      console.error('Failed to fetch time entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const handleClockIn = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const location = await getLocation();
      
      const { data, error } = await supabase
        .from('power_washing_time_entries')
        .insert({
          job_id: jobId,
          employee_id: user.id,
          shop_id: shopId,
          clock_in: new Date().toISOString(),
          gps_lat: location?.lat || null,
          gps_lng: location?.lng || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setActiveEntry(data);
      toast.success('Clocked in successfully');
      onTimeUpdate?.();
    } catch (error) {
      console.error('Clock in failed:', error);
      toast.error('Failed to clock in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('power_washing_time_entries')
        .update({
          clock_out: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', activeEntry.id);

      if (error) throw error;
      
      setActiveEntry(null);
      setNotes('');
      toast.success('Clocked out successfully');
      fetchEntries();
      onTimeUpdate?.();
    } catch (error) {
      console.error('Clock out failed:', error);
      toast.error('Failed to clock out');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBreak = async (minutes: number) => {
    if (!activeEntry) return;
    
    try {
      const newBreakMinutes = (activeEntry.break_minutes || 0) + minutes;
      const { error } = await supabase
        .from('power_washing_time_entries')
        .update({ break_minutes: newBreakMinutes })
        .eq('id', activeEntry.id);

      if (error) throw error;
      
      setActiveEntry({ ...activeEntry, break_minutes: newBreakMinutes });
      toast.success(`Added ${minutes} minute break`);
    } catch (error) {
      console.error('Failed to add break:', error);
      toast.error('Failed to add break');
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalTime = () => {
    let total = 0;
    entries.forEach(entry => {
      if (entry.clock_out) {
        const elapsed = differenceInSeconds(new Date(entry.clock_out), new Date(entry.clock_in));
        total += elapsed - (entry.break_minutes * 60);
      }
    });
    if (activeEntry) {
      total += elapsedSeconds;
    }
    return total;
  };

  if (isLoading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Timer */}
      <Card className={activeEntry ? 'border-primary' : ''}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-5xl font-mono font-bold mb-4">
              {activeEntry ? formatTime(elapsedSeconds) : formatTime(getTotalTime())}
            </div>
            
            {activeEntry && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                <Clock className="h-4 w-4" />
                Started at {format(new Date(activeEntry.clock_in), 'h:mm a')}
                {activeEntry.gps_lat && (
                  <Badge variant="outline" className="ml-2">
                    <MapPin className="h-3 w-3 mr-1" />
                    GPS
                  </Badge>
                )}
              </div>
            )}

            <div className="flex justify-center gap-2 flex-wrap">
              {!activeEntry ? (
                <Button size="lg" onClick={handleClockIn} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
                  Clock In
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="lg" onClick={() => handleAddBreak(15)}>
                    <Coffee className="h-5 w-5 mr-2" />
                    +15 min break
                  </Button>
                  <Button variant="destructive" size="lg" onClick={handleClockOut} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Square className="h-5 w-5 mr-2" />}
                    Clock Out
                  </Button>
                </>
              )}
            </div>

            {activeEntry && (
              <div className="mt-4">
                <Textarea
                  placeholder="Add notes about your work..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-sm"
                  rows={2}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time Entries History */}
      {entries.filter(e => e.clock_out).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {entries.filter(e => e.clock_out).map(entry => {
                const duration = differenceInSeconds(
                  new Date(entry.clock_out!), 
                  new Date(entry.clock_in)
                ) - (entry.break_minutes * 60);
                
                return (
                  <div key={entry.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">
                        {format(new Date(entry.clock_in), 'MMM d')}
                      </p>
                      <p className="text-muted-foreground">
                        {format(new Date(entry.clock_in), 'h:mm a')} - {format(new Date(entry.clock_out!), 'h:mm a')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium">{formatTime(duration)}</p>
                      {entry.break_minutes > 0 && (
                        <p className="text-xs text-muted-foreground">{entry.break_minutes}m break</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
