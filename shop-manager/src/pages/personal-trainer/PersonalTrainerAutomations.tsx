import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Zap, Bell, UserPlus, Dumbbell, Clock, Package, XCircle, Trophy, Ghost,
  Play, Loader2, Settings, ChevronRight, CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TRIGGER_TYPES = [
  { type: 'new_client', label: 'New Client Signup', icon: UserPlus, color: 'from-blue-500 to-cyan-500', description: 'Welcome message + intake form when a new client registers' },
  { type: 'workout_assigned', label: 'Workout Assigned', icon: Dumbbell, color: 'from-orange-500 to-red-500', description: 'Notify client when a new program is assigned' },
  { type: 'no_checkin_7d', label: 'No Check-In (7 Days)', icon: Clock, color: 'from-amber-500 to-orange-500', description: 'Reminder when client hasn\'t checked in for a week' },
  { type: 'package_low', label: 'Package Low Balance', icon: Package, color: 'from-violet-500 to-purple-500', description: 'Upsell message when sessions are running low (≤2 left)' },
  { type: 'missed_appointment', label: 'Missed Appointment', icon: XCircle, color: 'from-red-500 to-rose-500', description: 'Follow-up when client is a no-show' },
  { type: 'milestone', label: 'Client Milestone', icon: Trophy, color: 'from-emerald-500 to-green-500', description: 'Congratulations when client hits a goal' },
  { type: 'inactive_client', label: 'Inactive Client (14 Days)', icon: Ghost, color: 'from-gray-500 to-slate-500', description: 'Re-engagement offer after 14 days of no activity' },
];

export default function PersonalTrainerAutomations() {
  const { toast } = useToast();
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [runningCheck, setRunningCheck] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleForm, setRuleForm] = useState({ message_template: '', channel: 'in_app', delay_minutes: 0 });

  // Fetch automation rules
  const { data: rules = [] } = useQuery({
    queryKey: ['pt-automation-rules', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_automation_rules')
        .select('*').eq('shop_id', shopId).order('created_at');
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch recent notifications
  const { data: recentNotifications = [] } = useQuery({
    queryKey: ['pt-notifications-recent', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_notifications')
        .select('*, pt_clients(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!shopId,
  });

  // Run all automation checks
  const runChecks = async () => {
    if (!shopId) return;
    setRunningCheck(true);
    try {
      const { data, error } = await supabase.functions.invoke('pt-automations', {
        body: { action: 'run_all_checks', shopId },
      });
      if (error) throw error;
      const total = Object.values(data.notifications_created || {}).reduce((a: number, b: any) => a + (b as number), 0);
      toast({ title: `Automation scan complete`, description: `${total} new notification(s) created` });
      queryClient.invalidateQueries({ queryKey: ['pt-notifications-recent'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setRunningCheck(false); }
  };

  // Toggle rule active/inactive
  const toggleRule = async (triggerType: string, currentlyActive: boolean) => {
    if (!shopId) return;
    const existing = rules.find((r: any) => r.trigger_type === triggerType);
    if (existing) {
      await (supabase as any).from('pt_automation_rules').update({ is_active: !currentlyActive }).eq('id', existing.id);
    } else {
      const trigger = TRIGGER_TYPES.find(t => t.type === triggerType);
      await (supabase as any).from('pt_automation_rules').insert({
        shop_id: shopId, trigger_type: triggerType, is_active: true,
        message_template: `Default message for ${trigger?.label || triggerType}`,
        channel: 'in_app',
      });
    }
    queryClient.invalidateQueries({ queryKey: ['pt-automation-rules'] });
  };

  // Save rule customization
  const saveRule = async () => {
    if (!shopId || !editingRule) return;
    const existing = rules.find((r: any) => r.trigger_type === editingRule);
    if (existing) {
      await (supabase as any).from('pt_automation_rules').update({
        message_template: ruleForm.message_template,
        channel: ruleForm.channel,
        delay_minutes: ruleForm.delay_minutes,
      }).eq('id', existing.id);
    } else {
      await (supabase as any).from('pt_automation_rules').insert({
        shop_id: shopId, trigger_type: editingRule, is_active: true,
        message_template: ruleForm.message_template,
        channel: ruleForm.channel,
        delay_minutes: ruleForm.delay_minutes,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['pt-automation-rules'] });
    setEditingRule(null);
    toast({ title: 'Rule saved' });
  };

  const getRuleForType = (type: string) => rules.find((r: any) => r.trigger_type === type);

  const triggerIcon = (type: string) => {
    const t = TRIGGER_TYPES.find(tt => tt.type === type);
    return t ? t.icon : Bell;
  };

  const triggerColor = (type: string) => {
    const t = TRIGGER_TYPES.find(tt => tt.type === type);
    return t?.color || 'from-gray-500 to-slate-500';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Automations
          </h1>
          <p className="text-muted-foreground mt-1">Automated triggers that save time and increase retention</p>
        </div>
        <Button
          onClick={runChecks}
          disabled={runningCheck}
          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
        >
          {runningCheck ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Run All Checks Now
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules"><Zap className="h-3.5 w-3.5 mr-1" />Automation Rules</TabsTrigger>
          <TabsTrigger value="history"><Bell className="h-3.5 w-3.5 mr-1" />Notification History</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRIGGER_TYPES.map((trigger) => {
              const rule = getRuleForType(trigger.type);
              const isActive = rule?.is_active ?? false;
              const Icon = trigger.icon;

              return (
                <Card key={trigger.type} className={`border-0 shadow-md transition-all ${isActive ? 'ring-1 ring-primary/20' : 'opacity-75'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${trigger.color} shadow-lg flex-shrink-0`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-sm">{trigger.label}</h3>
                          <Switch checked={isActive} onCheckedChange={() => toggleRule(trigger.type, isActive)} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{trigger.description}</p>
                        {rule && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">{rule.channel}</Badge>
                            {rule.delay_minutes > 0 && <Badge variant="outline" className="text-[10px]">{rule.delay_minutes}min delay</Badge>}
                          </div>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          className="mt-2 text-xs h-7 px-2"
                          onClick={() => {
                            setEditingRule(trigger.type);
                            setRuleForm({
                              message_template: rule?.message_template || '',
                              channel: rule?.channel || 'in_app',
                              delay_minutes: rule?.delay_minutes || 0,
                            });
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />Customize
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['new_client', 'no_checkin_7d', 'package_low', 'missed_appointment'].map(type => {
              const count = recentNotifications.filter((n: any) => n.trigger_type === type).length;
              const trigger = TRIGGER_TYPES.find(t => t.type === type);
              const Icon = trigger?.icon || Bell;
              return (
                <Card key={type} className="border-0 shadow-sm">
                  <CardContent className="p-3 text-center">
                    <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-[10px] text-muted-foreground">{trigger?.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Notification Log */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {recentNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No notifications sent yet</p>
                    <p className="text-xs">Run a check to scan for trigger conditions</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentNotifications.map((notif: any) => {
                      const Icon = triggerIcon(notif.trigger_type);
                      return (
                        <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${triggerColor(notif.trigger_type)} flex-shrink-0`}>
                            <Icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{notif.title}</p>
                              {notif.is_read && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {notif.pt_clients?.first_name} {notif.pt_clients?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{notif.message}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-1">{format(new Date(notif.created_at), 'MMM d, h:mm a')}</p>
                          </div>
                          <Badge variant={notif.is_read ? 'secondary' : 'default'} className="text-[10px] flex-shrink-0">
                            {notif.is_read ? 'Read' : 'Unread'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={(o) => !o && setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Customize: {TRIGGER_TYPES.find(t => t.type === editingRule)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Message Template</Label>
              <Textarea
                value={ruleForm.message_template}
                onChange={(e) => setRuleForm(prev => ({ ...prev, message_template: e.target.value }))}
                placeholder="Enter the notification message..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">Use {'{first_name}'} for client name</p>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={ruleForm.channel} onValueChange={(v) => setRuleForm(prev => ({ ...prev, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-App Notification</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delay (minutes)</Label>
              <Input
                type="number" min={0}
                value={ruleForm.delay_minutes}
                onChange={(e) => setRuleForm(prev => ({ ...prev, delay_minutes: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <Button onClick={saveRule} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white">
              Save Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
