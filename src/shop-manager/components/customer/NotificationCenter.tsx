import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Settings, Package, Heart, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { customerNotificationService, CustomerNotification, NotificationPreferences } from '@/services/customer/notificationService';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  userId: string;
  className?: string;
}

const notificationIcons = {
  order_confirmed: Package,
  order_shipped: Package,
  order_delivered: Package,
  order_cancelled: Package,
  price_drop: AlertTriangle,
  back_in_stock: Package,
  wishlist_update: Heart,
};

const notificationColors = {
  order_confirmed: 'default',
  order_shipped: 'secondary',
  order_delivered: 'default',
  order_cancelled: 'destructive',
  price_drop: 'secondary',
  back_in_stock: 'default',
  wishlist_update: 'secondary',
};

export function NotificationCenter({ userId, className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    loadPreferences();
    
    // Subscribe to new notifications
    const channel = customerNotificationService.subscribeToNotifications(userId, (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      toast({
        title: notification.title,
        description: notification.message,
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, toast]);

  const loadNotifications = async () => {
    try {
      const [notificationsData, count] = await Promise.all([
        customerNotificationService.getUserNotifications(userId),
        customerNotificationService.getUnreadCount(userId)
      ]);
      
      setNotifications(notificationsData);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const preferencesData = await customerNotificationService.getNotificationPreferences(userId);
      setPreferences(preferencesData);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await customerNotificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await customerNotificationService.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({
        title: "All notifications marked as read",
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return;
    
    try {
      const updated = await customerNotificationService.updateNotificationPreferences(userId, updates);
      setPreferences(updated);
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive"
      });
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            
            <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Notification Preferences</DialogTitle>
                </DialogHeader>
                
                {preferences && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Delivery Methods</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email">Email notifications</Label>
                          <Switch
                            id="email"
                            checked={preferences.email_notifications}
                            onCheckedChange={(checked) => 
                              updatePreferences({ email_notifications: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="push">Push notifications</Label>
                          <Switch
                            id="push"
                            checked={preferences.push_notifications}
                            onCheckedChange={(checked) => 
                              updatePreferences({ push_notifications: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sms">SMS notifications</Label>
                          <Switch
                            id="sms"
                            checked={preferences.sms_notifications}
                            onCheckedChange={(checked) => 
                              updatePreferences({ sms_notifications: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Notification Types</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="orders">Order updates</Label>
                          <Switch
                            id="orders"
                            checked={preferences.order_updates}
                            onCheckedChange={(checked) => 
                              updatePreferences({ order_updates: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="prices">Price alerts</Label>
                          <Switch
                            id="prices"
                            checked={preferences.price_alerts}
                            onCheckedChange={(checked) => 
                              updatePreferences({ price_alerts: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="marketing">Marketing emails</Label>
                          <Switch
                            id="marketing"
                            checked={preferences.marketing}
                            onCheckedChange={(checked) => 
                              updatePreferences({ marketing: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="unread" className="mt-4">
            <ScrollArea className="h-[400px]">
              {unreadNotifications.length > 0 ? (
                <div className="space-y-3">
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No unread notifications</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[400px]">
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface NotificationItemProps {
  notification: CustomerNotification;
  onMarkAsRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] || Bell;
  const color = notificationColors[notification.type] || 'default';

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      notification.read 
        ? "bg-background border-border" 
        : "bg-muted/50 border-muted-foreground/20"
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "text-sm font-medium",
              !notification.read && "font-semibold"
            )}>
              {notification.title}
            </h4>
            <Badge variant={color as any} className="text-xs">
              {notification.type.replace('_', ' ')}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {notification.message}
          </p>
          
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkAsRead(notification.id)}
            className="shrink-0"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}