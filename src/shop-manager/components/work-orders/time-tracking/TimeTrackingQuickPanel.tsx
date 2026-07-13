
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getWorkOrderTimeEntries, addTimeEntryToWorkOrder, updateTimeEntry } from "@/services/workOrder/workOrderTimeTrackingService";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TimeEntry } from "@/types/workOrder";

interface TimeTrackingQuickPanelProps {
  workOrderId: string;
}

export function TimeTrackingQuickPanel({ workOrderId }: TimeTrackingQuickPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [clockedInEntry, setClockedInEntry] = useState<TimeEntry | null>(null);

  useEffect(() => {
    fetchCurrentEntry();
    // eslint-disable-next-line
  }, [workOrderId]);

  const fetchCurrentEntry = async () => {
    setIsLoading(true);
    try {
      const entries = await getWorkOrderTimeEntries(workOrderId);
      const active = entries.find(e => !e.end_time);
      setClockedInEntry(active || null);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleClockOn = async () => {
    setIsLoading(true);
    try {
      const userName = "Technician"; // Replace with actual user profile logic
      const userId = "1";
      const now = new Date().toISOString();
      const newEntry = {
        employee_id: userId,
        employee_name: userName,
        start_time: now,
        duration: 0,
        billable: true,
        notes: "",
        created_at: now
      };
      await addTimeEntryToWorkOrder(workOrderId, newEntry);
      toast({ title: "Clocked On", description: "Tech clocked on." });
      fetchCurrentEntry();
    } catch (e) {
      toast({ title: "Clock On Failed", description: "Unable to clock on.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleClockOff = async () => {
    if (!clockedInEntry) return;
    setIsLoading(true);
    try {
      const end = new Date().toISOString();
      const updates = {
        end_time: end,
        duration: (new Date(end).getTime() - new Date(clockedInEntry.start_time).getTime()) / (1000 * 60),
        billable: true
      };
      await updateTimeEntry(clockedInEntry.id, updates);
      toast({ title: "Clocked Off", description: "Tech clocked off." });
      fetchCurrentEntry();
    } catch (e) {
      toast({ title: "Clock Off Failed", description: "Unable to clock off.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tech Time Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center">
            <Loader2 className="animate-spin mr-2" />
            Loading...
          </div>
        ) : (
          <div className="flex gap-4 items-center">
            {clockedInEntry ? (
              <>
                <span className="font-bold text-green-600">Clocked ON at: {new Date(clockedInEntry.start_time).toLocaleTimeString()}</span>
                <Button size="sm" variant="destructive" onClick={handleClockOff}>
                  <X className="h-4 w-4 mr-1" />
                  Clock Off
                </Button>
              </>
            ) : (
              <Button size="sm" variant="default" onClick={handleClockOn}>
                <Check className="h-4 w-4 mr-1" />
                Clock On
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
