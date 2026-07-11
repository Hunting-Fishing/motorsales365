import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Search,
  Mail,
  MessageSquare,
  Bell,
  Phone,
  Pause,
  Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QueueItem {
  id: string;
  recipient_type: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  channel: string;
  subject: string | null;
  content: string;
  status: string;
  priority: number;
  scheduled_for: string;
  sent_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
}

export function NotificationQueueMonitor() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    channel: 'all',
    search: ''
  });
  const { toast } = useToast();

  const fetchQueueItems = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('notification_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }

      if (filter.channel !== 'all') {
        query = query.eq('channel', filter.channel);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];
      
      if (filter.search) {
        filteredData = filteredData.filter(item => 
          item.subject?.toLowerCase().includes(filter.search.toLowerCase()) ||
          item.recipient_email?.toLowerCase().includes(filter.search.toLowerCase()) ||
          item.content?.toLowerCase().includes(filter.search.toLowerCase())
        );
      }

      setQueueItems(filteredData);
    } catch (error) {
      console.error('Error fetching queue items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification queue',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const retryNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notification_queue')
        .update({ 
          status: 'pending',
          retry_count: 0,
          failed_at: null,
          failure_reason: null
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification queued for retry'
      });
      
      fetchQueueItems();
    } catch (error) {
      console.error('Error retrying notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry notification',
        variant: 'destructive'
      });
    }
  };

  const cancelNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification cancelled'
      });
      
      fetchQueueItems();
    } catch (error) {
      console.error('Error cancelling notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel notification',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchQueueItems();
  }, [filter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <Pause className="h-4 w-4 text-gray-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in_app': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 4) return <Badge className="bg-red-100 text-red-800">High</Badge>;
    if (priority >= 3) return <Badge className="bg-orange-100 text-orange-800">Medium</Badge>;
    return <Badge className="bg-green-100 text-green-800">Low</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Queue Monitor
          </CardTitle>
          <CardDescription>
            View and manage pending, sent, and failed notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search notifications..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="w-64"
              />
            </div>

            <Select
              value={filter.status}
              onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.channel}
              onValueChange={(value) => setFilter(prev => ({ ...prev, channel: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
                <SelectItem value="push">Push</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchQueueItems}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Queue Items */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse bg-gray-100 h-24 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {queueItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <h4 className="font-medium">
                          {item.subject || 'No Subject'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          To: {item.recipient_email || item.recipient_phone || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      {getPriorityBadge(item.priority)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {getChannelIcon(item.channel)}
                      <span className="capitalize">{item.channel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {item.sent_at 
                          ? `Sent ${new Date(item.sent_at).toLocaleString()}`
                          : `Scheduled ${new Date(item.scheduled_for).toLocaleString()}`
                        }
                      </span>
                    </div>
                    <div>
                      Recipient: <span className="capitalize">{item.recipient_type}</span>
                    </div>
                    {item.retry_count > 0 && (
                      <div>
                        Retries: {item.retry_count}/{item.max_retries}
                      </div>
                    )}
                  </div>

                  {item.failure_reason && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-sm text-red-800">
                        <strong>Failure Reason:</strong> {item.failure_reason}
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {item.content}
                    </p>
                  </div>

                  {(item.status === 'failed' || item.status === 'pending') && (
                    <div className="flex justify-end gap-2">
                      {item.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryNotification(item.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      )}
                      {item.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelNotification(item.id)}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {queueItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications found matching your filters</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}