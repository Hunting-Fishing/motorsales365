import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardCheck,
  FileText,
  Eye,
  Loader2,
  Shield,
  Settings2,
  Bell,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAllUserRoles } from '@/hooks/useAllUserRoles';

export default function SepticInspections() {
  const { shopId } = useShopId();
  const navigate = useNavigate();
  const { data: roles = [] } = useAllUserRoles();

  const canManageSettings = roles.some(r =>
    ['owner', 'admin', 'manager'].includes(r.name)
  );

  // Fetch published inspection templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['septic-inspection-templates', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_inspection_templates')
        .select(`
          id, name, description, version, is_published, created_at,
          septic_inspection_template_sections(
            id,
            septic_inspection_template_items(id)
          )
        `)
        .eq('shop_id', shopId!)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        sectionCount: t.septic_inspection_template_sections?.length || 0,
        itemCount: t.septic_inspection_template_sections?.reduce(
          (sum: number, s: any) => sum + (s.septic_inspection_template_items?.length || 0), 0
        ) || 0,
      }));
    },
    enabled: !!shopId,
  });

  // Fetch regulatory classifications
  const { data: classifications = [], isLoading: classificationsLoading } = useQuery({
    queryKey: ['septic-regulatory-classifications', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_regulatory_classifications')
        .select('*')
        .eq('shop_id', shopId!)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch system types
  const { data: systemTypes = [], isLoading: systemTypesLoading } = useQuery({
    queryKey: ['septic-system-types', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_system_types')
        .select('*')
        .eq('shop_id', shopId!)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch completed inspections
  const { data: inspections = [], isLoading: inspectionsLoading } = useQuery({
    queryKey: ['septic-completed-inspections', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_inspection_records')
        .select(`
          id, inspection_date, status, overall_condition, inspector_notes, created_at,
          septic_tanks(tank_identifier, capacity_gallons),
          profiles:inspector_id(first_name, last_name)
        `)
        .eq('shop_id', shopId!)
        .order('inspection_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch inventory alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['septic-inventory-alerts', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_inventory_alerts')
        .select('*')
        .eq('shop_id', shopId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const SettingsLink = ({ tab }: { tab: string }) => {
    if (!canManageSettings) return null;
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/septic/settings?tab=${tab}`)}
        className="gap-1.5"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Manage in Settings
      </Button>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inspections & Compliance</h1>
          <p className="text-sm text-muted-foreground">
            View inspection forms, system regulations, and compliance records
          </p>
        </div>
      </div>

      <Tabs defaultValue="forms" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forms" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Inspection Forms</span>
            <span className="sm:hidden">Forms</span>
          </TabsTrigger>
          <TabsTrigger value="regulations" className="gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">System Regulations</span>
            <span className="sm:hidden">Regulations</span>
          </TabsTrigger>
          <TabsTrigger value="inspections" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Completed Inspections</span>
            <span className="sm:hidden">Completed</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Inventory Alerts</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Inspection Forms (read-only) ── */}
        <TabsContent value="forms" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Published Inspection Forms</h2>
            <SettingsLink tab="inspection-forms" />
          </div>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No published inspection forms yet.</p>
                {canManageSettings && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate('/septic/settings?tab=inspection-forms')}
                  >
                    Create in Settings
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template: any) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">
                        v{template.version}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{template.sectionCount} sections</span>
                      <span>•</span>
                      <span>{template.itemCount} items</span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => navigate(`/septic/inspection-form/${template.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Use Form
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: System Regulations (read-only) ── */}
        <TabsContent value="regulations" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">System Regulations</h2>
            <SettingsLink tab="system-regulations" />
          </div>

          {classificationsLoading || systemTypesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Regulatory Classifications */}
              {classifications.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Regulatory Classifications
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {classifications.map((cls: any) => (
                      <Card key={cls.id}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{cls.name}</span>
                            {cls.classification_code && (
                              <Badge variant="outline" className="text-[10px]">
                                {cls.classification_code}
                              </Badge>
                            )}
                          </div>
                          {cls.description && (
                            <p className="text-xs text-muted-foreground">{cls.description}</p>
                          )}
                          {cls.province_state && (
                            <p className="text-xs text-muted-foreground">
                              Region: {cls.province_state}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* System Types */}
              {systemTypes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    System Types
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {systemTypes.map((st: any) => (
                      <Card key={st.id}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{st.name}</span>
                            {st.system_code && (
                              <Badge variant="outline" className="text-[10px]">
                                {st.system_code}
                              </Badge>
                            )}
                          </div>
                          {st.description && (
                            <p className="text-xs text-muted-foreground">{st.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            {st.typical_lifespan_years && (
                              <Badge variant="secondary">
                                Lifespan: {st.typical_lifespan_years} yrs
                              </Badge>
                            )}
                            {st.maintenance_frequency_months && (
                              <Badge variant="secondary">
                                Maintenance: every {st.maintenance_frequency_months} mo
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {classifications.length === 0 && systemTypes.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No regulations configured yet.</p>
                    {canManageSettings && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate('/septic/settings?tab=system-regulations')}
                      >
                        Configure in Settings
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Tab 3: Completed Inspections ── */}
        <TabsContent value="inspections" className="space-y-4">
          <h2 className="text-lg font-semibold">Completed Inspections</h2>
          {inspectionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : inspections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No completed inspections yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {inspections.map((insp: any) => {
                const inspector = insp.profiles as any;
                const tank = insp.septic_tanks as any;
                const conditionColor =
                  insp.overall_condition === 'good' ? 'bg-emerald-500/15 text-emerald-700' :
                  insp.overall_condition === 'fair' ? 'bg-amber-500/15 text-amber-700' :
                  insp.overall_condition === 'poor' ? 'bg-red-500/15 text-red-700' :
                  'bg-muted text-muted-foreground';

                return (
                  <Card key={insp.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {tank?.tank_identifier || 'Unknown Tank'}
                          </span>
                          {tank?.capacity_gallons && (
                            <span className="text-xs text-muted-foreground">
                              ({tank.capacity_gallons} gal)
                            </span>
                          )}
                          <Badge className={`text-[10px] ${conditionColor}`}>
                            {insp.overall_condition || insp.status}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>
                            {insp.inspection_date
                              ? format(new Date(insp.inspection_date), 'MMM d, yyyy')
                              : 'No date'}
                          </span>
                          {inspector && (
                            <span>
                              Inspector: {inspector.first_name} {inspector.last_name}
                            </span>
                          )}
                        </div>
                        {insp.inspector_notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {insp.inspector_notes}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 4: Inventory Alerts (read-only) ── */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Inventory Alerts</h2>
            <SettingsLink tab="alerts" />
          </div>
          {alertsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active alerts.</p>
                {canManageSettings && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate('/septic/settings?tab=alerts')}
                  >
                    Configure in Settings
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {alerts.map((alert: any) => {
                const severityColor =
                  alert.severity === 'critical' ? 'bg-red-500/15 text-red-700 border-red-500/30' :
                  alert.severity === 'high' ? 'bg-orange-500/15 text-orange-700 border-orange-500/30' :
                  alert.severity === 'medium' ? 'bg-amber-500/15 text-amber-700 border-amber-500/30' :
                  'bg-blue-500/15 text-blue-700 border-blue-500/30';

                return (
                  <Card key={alert.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm flex-1">{alert.alert_name || alert.name || 'Alert'}</span>
                        {alert.severity && (
                          <Badge className={`text-[10px] ${severityColor}`}>
                            {alert.severity}
                          </Badge>
                        )}
                      </div>
                      {alert.description && (
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                      )}
                      {alert.threshold_value && (
                        <p className="text-xs text-muted-foreground">
                          Threshold: {alert.threshold_value} {alert.threshold_unit || ''}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
