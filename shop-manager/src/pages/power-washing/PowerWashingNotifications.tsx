import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Bell,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  ArrowLeft,
  Filter,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Notification {
  id: string;
  job_id: string | null;
  notification_type: string;
  channel: string;
  recipient: string;
  subject: string | null;
  message: string;
  status: string;
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export default function PowerWashingNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    channel: 'email',
    notification_type: 'reminder',
    recipient: '',
    subject: '',
    message: '',
    scheduled_for: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['power-washing-notifications', filterStatus, filterChannel],
    queryFn: async () => {
      let query = supabase
        .from('power_washing_notifications')
        .select('*')
        .order('scheduled_for', { ascending: false });
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterChannel !== 'all') {
        query = query.eq('channel', filterChannel);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async () => {
      const { data: shopData } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from('power_washing_notifications')
        .insert({
          shop_id: shopData?.shop_id,
          ...newNotification,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-notifications'] });
      toast.success('Notification scheduled');
      setIsCreateOpen(false);
      setNewNotification({
        channel: 'email',
        notification_type: 'reminder',
        recipient: '',
        subject: '',
        message: '',
        scheduled_for: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      });
    },
    onError: () => {
      toast.error('Failed to create notification');
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'sent': return <Send className="h-4 w-4 text-blue-500" />;
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'sent': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const pendingCount = notifications?.filter(n => n.status === 'pending').length || 0;
  const sentCount = notifications?.filter(n => n.status === 'sent' || n.status === 'delivered').length || 0;
  const failedCount = notifications?.filter(n => n.status === 'failed').length || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bell className="h-8 w-8 text-blue-500" />
              Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage customer reminders and notifications
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Notification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Channel</Label>
                    <Select 
                      value={newNotification.channel} 
                      onValueChange={(v) => setNewNotification(prev => ({ ...prev, channel: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select 
                      value={newNotification.notification_type} 
                      onValueChange={(v) => setNewNotification(prev => ({ ...prev, notification_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="confirmation">Confirmation</SelectItem>
                        <SelectItem value="completion">Completion</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Recipient</Label>
                  <Input
                    value={newNotification.recipient}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, recipient: e.target.value }))}
                    placeholder={newNotification.channel === 'email' ? 'email@example.com' : '+1 (555) 123-4567'}
                  />
                </div>
                {newNotification.channel === 'email' && (
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={newNotification.subject}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Notification subject"
                    />
                  </div>
                )}
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={newNotification.message}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Notification message"
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Schedule For</Label>
                  <Input
                    type="datetime-local"
                    value={newNotification.scheduled_for}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, scheduled_for: e.target.value }))}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => createNotificationMutation.mutate()}
                  disabled={!newNotification.recipient || !newNotification.message}
                >
                  Schedule Notification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sentCount}</p>
              <p className="text-sm text-muted-foreground">Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{failedCount}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-muted">
                      {getChannelIcon(notification.channel)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {notification.notification_type.replace('_', ' ').charAt(0).toUpperCase() + 
                           notification.notification_type.slice(1).replace('_', ' ')}
                        </span>
                        <Badge className={getStatusColor(notification.status)}>
                          {getStatusIcon(notification.status)}
                          <span className="ml-1">{notification.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        To: {notification.recipient}
                      </p>
                      {notification.subject && (
                        <p className="text-sm font-medium text-foreground mb-1">
                          {notification.subject}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.error_message && (
                        <p className="text-sm text-red-500 mt-1">
                          Error: {notification.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Scheduled: {format(new Date(notification.scheduled_for), 'MMM d, h:mm a')}</p>
                    {notification.sent_at && (
                      <p>Sent: {format(new Date(notification.sent_at), 'MMM d, h:mm a')}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No Notifications</h3>
            <p className="text-muted-foreground mb-4">
              Schedule notifications to keep customers informed
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Notification
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
