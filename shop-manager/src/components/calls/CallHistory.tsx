
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCallHistory } from '@/services/calls/callService';
import { formatDistanceToNow } from 'date-fns';

interface CallHistoryProps {
  customerId: string;
}

interface CallRecord {
  id: string;
  customer_id: string;
  phone_number: string;
  call_type: string;
  call_status: string;
  call_direction: string;
  duration_seconds?: number;
  created_at: string;
  notes?: string;
  caller_name: string;
  call_started_at: string;
  call_ended_at?: string;
}

export const CallHistory = ({ customerId }: CallHistoryProps) => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setIsLoading(true);
        const callHistory = await getCallHistory(customerId);
        setCalls(callHistory);
      } catch (error) {
        console.error('Failed to fetch call history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchCalls();
    }
  }, [customerId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4">Loading call history...</p>
        </CardContent>
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4">No call history found for this customer.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {calls.map((call) => (
            <div key={call.id} className="border rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <div className="font-medium capitalize">{call.call_type.replace('_', ' ')}</div>
                <div className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                </div>
              </div>
              <div className="text-sm">
                <div>Phone: {call.phone_number}</div>
                <div>Duration: {call.duration_seconds || 0} seconds</div>
                <div>Status: <span className="capitalize">{call.call_status}</span></div>
                <div>Direction: <span className="capitalize">{call.call_direction}</span></div>
                {call.notes && <div className="mt-2">Notes: {call.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
