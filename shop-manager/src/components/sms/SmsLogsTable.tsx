
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Customer } from "@/types/customer";

interface SmsLog {
  id: string;
  customer_id: string;
  template_id?: string;
  template_name?: string;
  phone_number: string;
  message: string;
  status: string;
  sent_at: string;
  error_message?: string;
  twilio_sid?: string;
}

interface SmsLogsTableProps {
  customerId?: string;
  limit?: number;
}

export const SmsLogsTable: React.FC<SmsLogsTableProps> = ({ 
  customerId,
  limit = 10
}) => {
  // Fetch SMS logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['smsLogs', customerId, limit],
    queryFn: async () => {
      let query = supabase
        .from('sms_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge variant="success">Delivered</Badge>;
      case 'sent':
        return <Badge>Sent</Badge>;
      case 'queued':
        return <Badge variant="outline">Queued</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>SMS Logs</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">Loading SMS logs...</div>
        ) : logs?.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            No SMS logs found.
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(log.sent_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>{log.phone_number}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      <div className="tooltip" data-tip={log.message}>
                        {log.message.slice(0, 50)}{log.message.length > 50 ? '...' : ''}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
