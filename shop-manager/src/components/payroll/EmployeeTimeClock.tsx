import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useTimeCards } from '@/hooks/useTimeCards';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInSeconds } from 'date-fns';
import { 
  Play, 
  Square, 
  Clock,
  User,
  Coffee,
  PlayCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EmployeeTimeClock() {
  const { toast } = useToast();
  const { timeCards, clockIn, clockOut, startBreak, endBreak, loading } = useTimeCards();
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      return profile ? { ...user, profile } : { ...user, profile: null };
    },
  });

  // Find active time card for current user
  const activeTimeCard = timeCards.find(
    tc => tc.employee_id === currentUser?.id && tc.status === 'active'
  ) as any;

  // Check if currently on break
  const isOnBreak = activeTimeCard?.break_start_time && !activeTimeCard?.break_end_time;

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate elapsed time (excluding breaks)
  const getElapsedTime = () => {
    if (!activeTimeCard) return { hours: 0, minutes: 0, seconds: 0 };
    
    const clockInTime = new Date(activeTimeCard.clock_in_time);
    let totalSeconds = differenceInSeconds(currentTime, clockInTime);
    
    // Subtract break time if on break
    if (activeTimeCard.break_start_time) {
      const breakStart = new Date(activeTimeCard.break_start_time);
      if (activeTimeCard.break_end_time) {
        const breakEnd = new Date(activeTimeCard.break_end_time);
        totalSeconds -= differenceInSeconds(breakEnd, breakStart);
      } else {
        // Currently on break
        totalSeconds -= differenceInSeconds(currentTime, breakStart);
      }
    }
    
    // Also subtract any accumulated break minutes
    if (activeTimeCard.break_duration_minutes) {
      totalSeconds -= activeTimeCard.break_duration_minutes * 60;
    }
    
    totalSeconds = Math.max(0, totalSeconds);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return { hours, minutes, seconds };
  };

  const elapsed = getElapsedTime();

  const handleClockIn = async () => {
    if (!currentUser?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to clock in',
        variant: 'destructive',
      });
      return;
    }

    await clockIn(currentUser.id, undefined, notes || undefined);
    setNotes('');
  };

  const handleClockOut = async () => {
    if (!activeTimeCard) return;
    await clockOut(activeTimeCard.id, notes || undefined);
    setNotes('');
  };

  const handleStartBreak = async () => {
    if (!activeTimeCard) return;
    await startBreak(activeTimeCard.id);
  };

  const handleEndBreak = async () => {
    if (!activeTimeCard) return;
    await endBreak(activeTimeCard.id);
  };

  // Get today's completed time cards
  const todayCards = timeCards.filter(tc => {
    if (tc.employee_id !== currentUser?.id) return false;
    const clockIn = new Date(tc.clock_in_time);
    const today = new Date();
    return clockIn.toDateString() === today.toDateString() && tc.status !== 'active';
  });

  const todayTotalHours = todayCards.reduce((sum, tc) => sum + (tc.total_hours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {currentUser?.profile?.first_name} {currentUser?.profile?.last_name}
          </CardTitle>
          <CardDescription>
            {currentUser?.profile?.job_title || 'Employee'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Time Clock Widget */}
      <Card className="border-2">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Time Clock</CardTitle>
          <CardDescription>
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Time Display */}
          <div className="text-center">
            <p className="text-5xl font-mono font-bold">
              {format(currentTime, 'HH:mm:ss')}
            </p>
          </div>

          {/* Status Display */}
          {activeTimeCard ? (
            <div className="text-center space-y-4">
              <Badge 
                variant="default" 
                className={`text-lg py-2 px-4 ${isOnBreak ? 'bg-yellow-500' : 'bg-green-500'}`}
              >
                <Clock className="h-4 w-4 mr-2" />
                {isOnBreak ? 'On Break' : 'Clocked In'}
              </Badge>
              
              {/* Elapsed Time */}
              <div className="bg-muted rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-2">
                  {isOnBreak ? 'Time Worked (Paused)' : 'Time Worked'}
                </p>
                <p className="text-4xl font-mono font-bold">
                  {String(elapsed.hours).padStart(2, '0')}:
                  {String(elapsed.minutes).padStart(2, '0')}:
                  {String(elapsed.seconds).padStart(2, '0')}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Started at {format(new Date(activeTimeCard.clock_in_time), 'h:mm a')}
                </p>
              </div>

              {/* Break Buttons */}
              <div className="flex gap-2">
                {isOnBreak ? (
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="flex-1 h-12 border-green-500 text-green-600 hover:bg-green-50"
                    onClick={handleEndBreak}
                  >
                    <PlayCircle className="h-5 w-5 mr-2" />
                    End Break
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="flex-1 h-12 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    onClick={handleStartBreak}
                  >
                    <Coffee className="h-5 w-5 mr-2" />
                    Start Break
                  </Button>
                )}
              </div>

              {/* Clock Out Button */}
              <Button 
                size="lg" 
                variant="destructive" 
                className="w-full h-16 text-lg"
                onClick={handleClockOut}
                disabled={isOnBreak}
              >
                <Square className="h-6 w-6 mr-2" />
                Clock Out
              </Button>
              {isOnBreak && (
                <p className="text-sm text-muted-foreground">
                  End your break before clocking out
                </p>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Badge variant="secondary" className="text-lg py-2 px-4">
                Not Clocked In
              </Badge>

              {/* Today's Summary */}
              {todayTotalHours > 0 && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Today's Total</p>
                  <p className="text-2xl font-bold">{todayTotalHours.toFixed(2)} hours</p>
                </div>
              )}

              {/* Clock In Button */}
              <Button 
                size="lg" 
                className="w-full h-16 text-lg bg-green-600 hover:bg-green-700"
                onClick={handleClockIn}
                disabled={loading}
              >
                <Play className="h-6 w-6 mr-2" />
                Clock In
              </Button>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Shift Notes (optional)
            </label>
            <Textarea
              placeholder="Add notes about your shift..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Today's Time Cards */}
      {todayCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayCards.map((tc: any) => (
                <div key={tc.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">
                      {format(new Date(tc.clock_in_time), 'h:mm a')} - {' '}
                      {tc.clock_out_time ? format(new Date(tc.clock_out_time), 'h:mm a') : 'Ongoing'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tc.total_hours?.toFixed(2)} hours
                      {tc.overtime_hours && tc.overtime_hours > 0 && (
                        <span className="text-orange-500 ml-2">
                          ({tc.overtime_hours.toFixed(2)} OT)
                        </span>
                      )}
                      {tc.break_duration_minutes && tc.break_duration_minutes > 0 && (
                        <span className="text-yellow-600 ml-2">
                          ({tc.break_duration_minutes} min break)
                        </span>
                      )}
                    </p>
                    {tc.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{tc.notes}"
                      </p>
                    )}
                  </div>
                  <Badge variant={
                    tc.status === 'approved' ? 'default' :
                    tc.status === 'completed' ? 'secondary' :
                    'outline'
                  }>
                    {tc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
