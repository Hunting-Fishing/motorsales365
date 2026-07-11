import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Palette, Save, Loader2, Globe, Instagram, Facebook, Eye } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PersonalTrainerBranding() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: branding, isLoading } = useQuery({
    queryKey: ['pt-branding', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      const { data } = await (supabase as any).from('pt_gym_branding').select('*').eq('shop_id', shopId).maybeSingle();
      return data;
    },
    enabled: !!shopId,
  });

  const [form, setForm] = useState({
    gym_name: '', logo_url: '', primary_color: '#f97316', secondary_color: '#1e293b', accent_color: '#06b6d4',
    font_family: 'Plus Jakarta Sans', welcome_message: '', footer_text: '',
    social_instagram: '', social_facebook: '', social_website: '',
  });

  useEffect(() => {
    if (branding) setForm(f => ({ ...f, ...branding }));
  }, [branding]);

  const saveBranding = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const payload = { shop_id: shopId, ...form, updated_at: new Date().toISOString() };
      if (branding?.id) {
        const { error } = await (supabase as any).from('pt_gym_branding').update(payload).eq('id', branding.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('pt_gym_branding').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-branding'] });
      toast({ title: 'Branding saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6 text-violet-500" />White-Label Branding</h1>
          <p className="text-muted-foreground text-sm">Customize the client portal with your gym brand</p>
        </div>
        <Button onClick={() => saveBranding.mutate()} disabled={saveBranding.isPending} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
          {saveBranding.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Branding
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Brand Identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Gym / Brand Name</Label><Input value={form.gym_name} onChange={e => setForm(f => ({ ...f, gym_name: e.target.value }))} placeholder="FitLife Gym" /></div>
            <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." /></div>
            <div>
              <Label>Font Family</Label>
              <Input value={form.font_family} onChange={e => setForm(f => ({ ...f, font_family: e.target.value }))} placeholder="Plus Jakarta Sans" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Color Scheme</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Primary</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label>Secondary</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label>Accent</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="font-mono text-xs" />
                </div>
              </div>
            </div>
            {/* Live preview */}
            <div className="rounded-lg p-4 border" style={{ backgroundColor: form.secondary_color, fontFamily: form.font_family }}>
              <div className="flex items-center gap-2 mb-2">
                {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-8 w-8 rounded" />}
                <span style={{ color: form.primary_color }} className="font-bold text-lg">{form.gym_name || 'Your Gym'}</span>
              </div>
              <p className="text-white/80 text-sm">{form.welcome_message || 'Welcome to your fitness journey!'}</p>
              <div className="mt-2 inline-block px-3 py-1 rounded text-sm text-white font-medium" style={{ backgroundColor: form.primary_color }}>
                Get Started
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Messaging</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Welcome Message</Label><Textarea value={form.welcome_message} onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))} placeholder="Welcome to our gym..." rows={3} /></div>
            <div><Label>Footer Text</Label><Input value={form.footer_text} onChange={e => setForm(f => ({ ...f, footer_text: e.target.value }))} placeholder="© 2026 Your Gym. All rights reserved." /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Social Links</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2"><Instagram className="h-5 w-5 text-pink-500 shrink-0" /><Input value={form.social_instagram} onChange={e => setForm(f => ({ ...f, social_instagram: e.target.value }))} placeholder="https://instagram.com/yourgym" /></div>
            <div className="flex items-center gap-2"><Facebook className="h-5 w-5 text-blue-600 shrink-0" /><Input value={form.social_facebook} onChange={e => setForm(f => ({ ...f, social_facebook: e.target.value }))} placeholder="https://facebook.com/yourgym" /></div>
            <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-gray-500 shrink-0" /><Input value={form.social_website} onChange={e => setForm(f => ({ ...f, social_website: e.target.value }))} placeholder="https://yourgym.com" /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
