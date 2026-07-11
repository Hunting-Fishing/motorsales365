import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Info, Award, Mail, Plus, Loader2, Dumbbell, Heart, Target, Users, BarChart3, Calendar } from 'lucide-react';
import { SponsorCard } from '@/components/personal-trainer/about/SponsorCard';
import { useToast } from '@/hooks/use-toast';

export default function PersonalTrainerAbout() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', website: '', tier: 'bronze', description: '', logo_url: '' });

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['pt-sponsors', shopId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_sponsors')
        .select('*')
        .eq('shop_id', shopId!)
        .eq('is_active', true)
        .order('created_at');
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pt_sponsors').insert({
        shop_id: shopId!,
        ...form,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-sponsors'] });
      toast({ title: 'Sponsor added' });
      setAddOpen(false);
      setForm({ name: '', website: '', tier: 'bronze', description: '', logo_url: '' });
    },
    onError: () => toast({ title: 'Failed to add sponsor', variant: 'destructive' }),
  });

  const features = [
    { icon: Users, title: 'Client Management', desc: 'Track clients, goals, progress, and body metrics' },
    { icon: Dumbbell, title: 'Workout Programs', desc: 'Build custom programs with exercise libraries' },
    { icon: Heart, title: 'Health Tracking', desc: 'BMI, vitals, body composition with device integration' },
    { icon: Target, title: 'Nutrition Intelligence', desc: 'AI-powered meal plans and food tracking' },
    { icon: BarChart3, title: 'Business Analytics', desc: 'Reports, payroll, staff management, and billing' },
    { icon: Calendar, title: 'Scheduling', desc: 'Sessions, calendar, events, and class signups' },
  ];

  const tierOrder = ['platinum', 'gold', 'silver', 'bronze'];
  const sortedSponsors = [...sponsors].sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
          <Info className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">About</h1>
          <p className="text-sm text-muted-foreground">Learn about this platform and our sponsors</p>
        </div>
      </div>

      <Tabs defaultValue="about" className="space-y-4">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Personal Trainer Pro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                A comprehensive fitness management platform designed for personal trainers, gym owners, and fitness
                professionals. Manage clients, build workout programs, track nutrition, run your business operations,
                and engage your community — all from one integrated platform.
              </p>
              <div className="flex gap-2">
                <Badge>v2.0</Badge>
                <Badge variant="outline">Fitness Platform</Badge>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Key Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {features.map(f => (
                <Card key={f.title} className="border-border/50">
                  <CardContent className="p-4 flex gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0 h-fit">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-foreground">{f.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sponsors" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Our Sponsors</h3>
              <p className="text-sm text-muted-foreground">Brands that support our fitness community</p>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Sponsor</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Sponsor</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." /></div>
                  <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} /></div>
                  <div>
                    <Label>Tier</Label>
                    <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platinum">Platinum</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="bronze">Bronze</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
                  <Button className="w-full" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.name}>
                    {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Add Sponsor
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : sortedSponsors.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-1">No Sponsors Yet</h3>
                <p className="text-sm text-muted-foreground">Add your first sponsor to showcase brand partnerships.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedSponsors.map((s: any) => (
                <SponsorCard key={s.id} name={s.name} logoUrl={s.logo_url} website={s.website} tier={s.tier} description={s.description} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Mail className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-foreground">Get in Touch</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  For support, feedback, or sponsorship inquiries, reach out to your platform administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
