import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, User, Settings, Brain, BarChart3, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserShopId, useBusinessModules } from '@/hooks/useEnabledModules';
import { toast } from 'sonner';

type AccountMenuSettings = {
  hidden_items?: string[];
  item_overrides?: Record<string, { enabled?: boolean; modules?: string[]; roles?: string[] }>;
};

const ACCOUNT_ITEMS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'ai_hub', label: 'AI Hub', icon: Brain },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'team', label: 'Team', icon: Users },
];

const AVAILABLE_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'service_advisor', label: 'Service Advisor' },
  { value: 'technician', label: 'Technician' },
  { value: 'reception', label: 'Reception' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'parts_manager', label: 'Parts Manager' },
];

type ItemState = {
  enabled: boolean;
  modules: string[];
  roles: string[];
};

export function AccountMenuSettingsCard() {
  const queryClient = useQueryClient();
  const { data: shopId } = useUserShopId();
  const { data: businessModules = [] } = useBusinessModules();
  const moduleOptions = useMemo(
    () => businessModules.map((module) => ({ slug: module.slug, name: module.name })),
    [businessModules]
  );

  const { data: settings } = useQuery({
    queryKey: ['account-menu-settings', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      const { data, error } = await supabase
        .from('company_settings')
        .select('settings_value')
        .eq('shop_id', shopId)
        .eq('settings_key', 'account_menu')
        .maybeSingle();
      if (error) throw error;
      return (data?.settings_value ?? null) as AccountMenuSettings | null;
    },
    enabled: !!shopId,
  });

  const [itemsState, setItemsState] = useState<Record<string, ItemState>>({});
  const [hasInitializedDefaults, setHasInitializedDefaults] = useState(false);

  useEffect(() => {
    const hidden = new Set(settings?.hidden_items ?? []);
    const overrides = settings?.item_overrides ?? {};
    const nextState: Record<string, ItemState> = {};

    ACCOUNT_ITEMS.forEach((item) => {
      const override = overrides[item.id] ?? {};
      const isEnabled = override.enabled === false ? false : !hidden.has(item.id);
      nextState[item.id] = {
        enabled: isEnabled,
        modules: override.modules ?? [],
        roles: override.roles ?? [],
      };
    });

    setItemsState(nextState);
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: AccountMenuSettings) => {
      if (!shopId) throw new Error('Missing shop');
      const { error } = await supabase
        .from('company_settings')
        .upsert(
          {
            shop_id: shopId,
            settings_key: 'account_menu',
            settings_value: payload as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'shop_id,settings_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-menu-settings', shopId] });
      toast.success('Account menu settings saved');
    },
    onError: () => {
      toast.error('Failed to save account menu settings');
    },
  });

  useEffect(() => {
    if (!shopId || hasInitializedDefaults || settings !== null) return;
    const defaultSettings: AccountMenuSettings = {
      hidden_items: [],
      item_overrides: {
        ai_hub: { roles: ['owner', 'admin'] },
        reports: { roles: ['owner', 'admin', 'manager'] },
        team: { roles: ['owner', 'admin', 'manager'] },
        settings: { roles: ['owner', 'admin'] },
      },
    };

    updateMutation.mutate(defaultSettings);
    setHasInitializedDefaults(true);
  }, [shopId, settings, hasInitializedDefaults, updateMutation]);

  const handleToggleItem = (id: string) => {
    setItemsState((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id]?.enabled },
    }));
  };

  const handleToggleModule = (id: string, slug: string) => {
    setItemsState((prev) => {
      const current = prev[id]?.modules ?? [];
      const updated = current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug];
      return { ...prev, [id]: { ...prev[id], modules: updated } };
    });
  };

  const handleToggleRole = (id: string, role: string) => {
    setItemsState((prev) => {
      const current = prev[id]?.roles ?? [];
      const updated = current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role];
      return { ...prev, [id]: { ...prev[id], roles: updated } };
    });
  };

  const handleSave = async () => {
    const hiddenItems = ACCOUNT_ITEMS.filter((item) => !itemsState[item.id]?.enabled).map(
      (item) => item.id
    );
    const overrides: AccountMenuSettings['item_overrides'] = {};

    ACCOUNT_ITEMS.forEach((item) => {
      const state = itemsState[item.id];
      if (!state) return;
      if (!state.enabled || state.modules.length > 0 || state.roles.length > 0) {
        overrides[item.id] = {
          enabled: state.enabled,
          modules: state.modules.length ? state.modules : undefined,
          roles: state.roles.length ? state.roles : undefined,
        };
      }
    });

    await updateMutation.mutateAsync({
      hidden_items: hiddenItems,
      item_overrides: overrides,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <CardTitle>Account Menu Settings</CardTitle>
        </div>
        <CardDescription>
          Control which items appear in the My Account menu, with module and role filters.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ACCOUNT_ITEMS.map((item) => {
          const state = itemsState[item.id];
          const Icon = item.icon;
          return (
            <div key={item.id} className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">{item.label}</Label>
                </div>
                <Switch
                  checked={state?.enabled ?? true}
                  onCheckedChange={() => handleToggleItem(item.id)}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">Limit to Modules</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {moduleOptions.map((module) => (
                      <div key={module.slug} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${item.id}-module-${module.slug}`}
                          checked={state?.modules?.includes(module.slug)}
                          onCheckedChange={() => handleToggleModule(item.id, module.slug)}
                        />
                        <Label
                          htmlFor={`${item.id}-module-${module.slug}`}
                          className="text-sm cursor-pointer"
                        >
                          {module.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to show in all modules.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Limit to Roles</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_ROLES.map((role) => (
                      <div key={role.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${item.id}-role-${role.value}`}
                          checked={state?.roles?.includes(role.value)}
                          onCheckedChange={() => handleToggleRole(item.id, role.value)}
                        />
                        <Label
                          htmlFor={`${item.id}-role-${role.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {role.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to allow all roles.
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Account Menu'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
