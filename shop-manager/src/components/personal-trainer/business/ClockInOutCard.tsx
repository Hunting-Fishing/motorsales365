import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveShift {
  id: string;
  staff_name: string;
  clock_in: string;
  staff_id?: string;
  trainer_id?: string;
}

interface ClockInOutCardProps {
  activeShifts: ActiveShift[];
  onClockOut: (entryId: string) => void;
  clockingOut: boolean;
}

export function ClockInOutCard({ activeShifts, onClockOut, clockingOut }: ClockInOutCardProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (activeShifts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No active shifts right now</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {activeShifts.map(shift => (
        <Card key={shift.id} className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <LogIn className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{shift.staff_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Clocked in {formatDistanceToNow(new Date(shift.clock_in), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => onClockOut(shift.id)}
                disabled={clockingOut}
              >
                <LogOut className="h-3.5 w-3.5" /> Clock Out
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
