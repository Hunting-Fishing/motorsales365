import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ExternalLink, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AffiliateSettingsCard() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tag, setTag] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['affiliate-settings', shopId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_shop_affiliate_settings' as any)
        .select('*')
        .eq('shop_id', shopId!)
        .maybeSingle();
      if (data) setTag((data as any).amazon_associate_tag || '');
      return data as any;
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (settings) {
        const { error } = await supabase
          .from('pt_shop_affiliate_settings' as any)
          .update({ amazon_associate_tag: tag } as any)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pt_shop_affiliate_settings' as any)
          .insert({ shop_id: shopId!, amazon_associate_tag: tag } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-settings'] });
      toast({ title: 'Amazon Associates tag saved' });
    },
    onError: () => toast({ title: 'Failed to save', variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-[#FF9900]" />
          Amazon Affiliate Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Enter your Amazon Associates tag to earn commissions when clients purchase supplements through your links.
        </p>
        <div>
          <Label className="text-xs">Associates Tag</Label>
          <Input
            placeholder="e.g. mygym-20"
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
