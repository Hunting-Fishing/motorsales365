import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Send, Bell, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import { FeatureRequestNotificationService } from '@/services/notifications/FeatureRequestNotificationService';

export function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const queryClient = useQueryClient();

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => FeatureRequestNotificationService.getUserNotificationPreferences(),
  });

  const { data: notificationHistory } = useQuery({
    queryKey: ['notification-history'],
    queryFn: () => FeatureRequestNotificationService.getNotificationHistory(20),
  });

  const { data: webhookLogs } = useQuery({
    queryKey: ['webhook-logs'],
    queryFn: () => FeatureRequestNotificationService.getWebhookLogs(20),
  });

  useEffect(() => {
    if (preferences) {
      setEmailNotifications(preferences.email_notifications ?? true);
      setSlackWebhookUrl((preferences as any).slack_webhook_url || '');
      setDiscordWebhookUrl((preferences as any).discord_webhook_url || '');
    }
  }, [preferences]);

  const updatePreferencesMutation = useMutation({
    mutationFn: FeatureRequestNotificationService.updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Notification preferences updated');
    },
    onError: (error) => {
      toast.error('Failed to update preferences');
      console.error(error);
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: ({ url, type }: { url: string; type: 'slack' | 'discord' }) =>
      FeatureRequestNotificationService.testWebhook(url, type),
    onSuccess: (success, variables) => {
      if (success) {
        toast.success(`${variables.type} webhook test successful`);
      } else {
        toast.error(`${variables.type} webhook test failed`);
      }
      queryClient.invalidateQueries({ queryKey: ['webhook-logs'] });
    },
    onError: () => {
      toast.error('Webhook test failed');
    },
  });

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate({
      email_notifications: emailNotifications,
      slack_webhook_url: slackWebhookUrl || null,
      discord_webhook_url: discordWebhookUrl || null,
    });
  };

  const handleTestWebhook = (url: string, type: 'slack' | 'discord') => {
    if (!url.trim()) {
      toast.error('Please enter a webhook URL first');
      return;
    }
    testWebhookMutation.mutate({ url: url.trim(), type });
  };

  if (preferencesLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notification Settings</h1>
      </div>

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList>
          <TabsTrigger value="preferences">
            <Bell className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="history">
            <AlertCircle className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhook Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
                <Label htmlFor="email-notifications">
                  Send email notifications for new feature requests
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                You'll receive email notifications when new feature requests are submitted.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Slack Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="slack-webhook"
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackWebhookUrl}
                    onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => handleTestWebhook(slackWebhookUrl, 'slack')}
                    disabled={!slackWebhookUrl.trim() || testWebhookMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a webhook in your Slack workspace to receive notifications.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Discord Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="discord-webhook">Discord Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="discord-webhook"
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => handleTestWebhook(discordWebhookUrl, 'discord')}
                    disabled={!discordWebhookUrl.trim() || testWebhookMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a webhook in your Discord server to receive notifications.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleSavePreferences}
              disabled={updatePreferencesMutation.isPending}
            >
              {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {notificationHistory?.map((notification: any) => (
            <Card key={(notification as any).id || Math.random()}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={(notification as any).sent ? 'default' : 'secondary'}>
                        {(notification as any).notification_type?.replace('_', ' ') || 'Notification'}
                      </Badge>
                      <Badge variant="outline">
                        {(notification as any).recipient_type || 'User'}
                      </Badge>
                      {(notification as any).sent ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm">
                      {(notification as any).feature_requests?.title || 'Feature Request'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date((notification as any).created_at || Date.now()).toLocaleString()}
                      {(notification as any).sent_at && (
                        <span> • Sent: {new Date((notification as any).sent_at).toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          {webhookLogs?.map((log: any) => (
            <Card key={(log as any).id || Math.random()}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{(log as any).webhook_type || 'webhook'}</Badge>
                      <Badge variant={(log as any).success ? 'default' : 'destructive'}>
                        {(log as any).response_status || 'Unknown'}
                      </Badge>
                      {(log as any).success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm truncate">{(log as any).webhook_url || 'URL not available'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date((log as any).created_at || Date.now()).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}