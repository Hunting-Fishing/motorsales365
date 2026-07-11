import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Info, CheckCircle, X, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SmartNotification {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'info' | 'warning' | 'error' | 'success';
  user_id: string;
  created_at: string;
  read: boolean;
  ai_generated: boolean;
  metadata?: any;
}

export const SmartNotifications = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['smart-notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('smart_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return (data || []).map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        priority: n.priority as 'low' | 'medium' | 'high' | 'urgent',
        type: n.type as 'info' | 'warning' | 'error' | 'success',
        user_id: n.user_id,
        created_at: n.created_at,
        read: n.read,
        ai_generated: n.ai_generated,
        metadata: n.metadata,
      })) as SmartNotification[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('smart_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-notifications'] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  });

  const dismissMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('smart_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-notifications'] });
      toast({
        title: "Dismissed",
        description: "Notification has been dismissed",
      });
    },
    onError: (error) => {
      console.error('Error dismissing notification:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss notification",
        variant: "destructive"
      });
    }
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
        return <X className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'info':
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'success':
        return 'bg-green-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    if (filter === 'ai') return notif.ai_generated;
    return notif.priority === filter;
  });

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'ai', label: 'AI Generated' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High Priority' }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smart Notifications</CardTitle>
          <CardDescription>Loading notifications...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Smart Notifications
          {notifications.filter(n => !n.read).length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {notifications.filter(n => !n.read).length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          AI-powered notifications to keep you informed about important business events
        </CardDescription>
        
        <div className="flex gap-2 flex-wrap pt-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No notifications</p>
            <p className="text-sm text-muted-foreground">
              You're all caught up!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`border rounded-lg p-4 space-y-3 ${
                  !notification.read ? 'border-l-4 border-l-primary bg-muted/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getTypeColor(notification.type)} text-white`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{notification.title}</h4>
                        {notification.ai_generated && (
                          <div title="AI Generated">
                            <Brain className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`capitalize ${getPriorityColor(notification.priority)}`}
                        >
                          {notification.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => dismissMutation.mutate(notification.id)}
                      disabled={dismissMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground ml-11">
                  {notification.message}
                </p>
                
                {notification.metadata && (
                  <div className="text-xs text-muted-foreground ml-11">
                    <div className="flex gap-4">
                      {notification.metadata.item && (
                        <span>Item: {notification.metadata.item}</span>
                      )}
                      {notification.metadata.customer && (
                        <span>Customer: {notification.metadata.customer}</span>
                      )}
                      {notification.metadata.metric && (
                        <span>Metric: {notification.metadata.metric}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
