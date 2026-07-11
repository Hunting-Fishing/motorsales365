import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';
import {
  Shield, Plus, Save, Loader2, Pencil, Trash2, ChevronDown, ChevronRight,
  Droplets, FlaskConical, AlertTriangle, MapPin, FileText
} from 'lucide-react';

const PROVINCES_STATES = [
  { group: 'Canada', items: [
    { value: 'BC', label: 'British Columbia' },
    { value: 'AB', label: 'Alberta' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'ON', label: 'Ontario' },
    { value: 'QC', label: 'Quebec' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
    { value: 'YT', label: 'Yukon' },
  ]},
  { group: 'USA', items: [
    { value: 'WA', label: 'Washington' },
    { value: 'OR', label: 'Oregon' },
    { value: 'CA', label: 'California' },
    { value: 'TX', label: 'Texas' },
    { value: 'FL', label: 'Florida' },
    { value: 'NY', label: 'New York' },
  ]},
];

const BC_REGULATION_PDF = '/documents/bc-sewerage-system-regulation-326-2004.pdf';

const BC_DEFAULTS = [
  {
    classification_code: 'TYPE_1',
    classification_name: 'Type 1 — Septic Tank Treatment',
    description: 'Treatment by septic tank only, with gravity or pumped dispersal field. Per SSR s.1: "Type 1 is treatment by septic tank only." The most common residential system in BC. Authorized persons (ROWPs) or professionals may construct/maintain. Must be filed with health authority before construction (SSR s.8).',
    treatment_level: 'Primary',
    dispersal_method: 'Gravity or pumped dispersal field',
    requires_disinfection: false,
    requires_additional_treatment: false,
    effluent_quality_standard: 'Septic tank effluent — no numeric limits (treatment by septic tank only)',
    regulatory_body: 'BC Ministry of Health / Health Authorities',
    regulatory_reference: 'Public Health Act — Sewerage System Regulation, B.C. Reg. 326/2004, s.1 "treatment method" (a)',
    typical_components: ['Septic Tank', 'Distribution Box', 'Dispersal Field', 'Pump Chamber (if pumped)'],
    maintenance_requirements: 'Owner must maintain per maintenance plan (SSR s.10). Keep maintenance records. Pump septic tank every 3–5 years. ROWPs or professionals may construct/maintain Type 1 & 2 systems (SSR s.6).',
    inspection_frequency_months: 12,
    display_order: 1,
  },
  {
    classification_code: 'TYPE_2',
    classification_name: 'Type 2 — Secondary Treatment',
    description: 'Per SSR s.1: "Type 2 is treatment that produces an effluent consistently containing less than 45 mg/L of total suspended solids and having a 5 day biochemical oxygen demand of less than 45 mg/L." Uses additional treatment beyond septic tank. ROWPs or professionals may construct/maintain (SSR s.6).',
    treatment_level: 'Secondary',
    dispersal_method: 'Reduced-size dispersal field, at-grade, or pressure distribution',
    requires_disinfection: false,
    requires_additional_treatment: true,
    effluent_quality_standard: 'TSS < 45 mg/L, BOD₅ < 45 mg/L (SSR s.1)',
    regulatory_body: 'BC Ministry of Health / Health Authorities',
    regulatory_reference: 'Public Health Act — Sewerage System Regulation, B.C. Reg. 326/2004, s.1 "treatment method" (b)',
    typical_components: ['Septic Tank', 'Secondary Treatment Unit (ATU/Media Filter/Sand Filter)', 'Dispersal Field'],
    maintenance_requirements: 'Owner must maintain per maintenance plan (SSR s.10). Quarterly maintenance by Authorized Person recommended. Keep records. Letter of certification required within 30 days of construction (SSR s.9).',
    inspection_frequency_months: 3,
    display_order: 2,
  },
  {
    classification_code: 'TYPE_3',
    classification_name: 'Type 3 — Advanced Treatment & Disinfection',
    description: 'Per SSR s.1: "Type 3 is treatment that produces an effluent consistently containing less than 10 mg/L of total suspended solids and having a 5 day biochemical oxygen demand of less than 10 mg/L, and a median fecal coliform density of less than 400 CFU per 100 mL." Must be constructed/maintained under supervision of a professional (SSR s.6(3)).',
    treatment_level: 'Tertiary',
    dispersal_method: 'Surface or sub-surface dispersal, spray irrigation, drip dispersal',
    requires_disinfection: true,
    requires_additional_treatment: true,
    effluent_quality_standard: 'TSS < 10 mg/L, BOD₅ < 10 mg/L, Fecal Coliform < 400 CFU/100mL (SSR s.1)',
    regulatory_body: 'BC Ministry of Health / Health Authorities',
    regulatory_reference: 'Public Health Act — Sewerage System Regulation, B.C. Reg. 326/2004, s.1 "treatment method" (c)',
    typical_components: ['Septic Tank', 'Advanced Treatment Unit', 'UV or Chlorine Disinfection', 'Monitoring/Sampling Port', 'Dispersal System'],
    maintenance_requirements: 'Must be supervised by a professional (SSR s.6(3)). Monthly system checks. Quarterly maintenance and effluent sampling. Annual compliance report. Owner must keep records (SSR s.10).',
    inspection_frequency_months: 1,
    display_order: 3,
  },
  {
    classification_code: 'HOLDING_TANK',
    classification_name: 'Holding Tank',
    description: 'Per SSR s.1: "a watertight container for holding domestic sewage until the domestic sewage is removed for treatment." Requires a permit from health officer (SSR s.4, $400 fee). Must not be constructed less than 15m from a well (SSR s.3.1). Not classified as a sewerage system.',
    treatment_level: 'None (Storage Only)',
    dispersal_method: 'None — pump and haul to approved facility',
    requires_disinfection: false,
    requires_additional_treatment: false,
    effluent_quality_standard: 'N/A — No discharge permitted. Watertight containment only.',
    regulatory_body: 'BC Ministry of Health / Health Authorities',
    regulatory_reference: 'Public Health Act — Sewerage System Regulation, B.C. Reg. 326/2004, Part 2 (ss. 4-5)',
    typical_components: ['Sealed Watertight Holding Tank', 'High-Level Alarm', 'Access Risers', 'Locked Lids'],
    maintenance_requirements: 'Maintain per maintenance plan filed with permit (SSR s.5). Owner must keep maintenance records. Pump when full. Monitor alarm. Permit required before construction (SSR s.4). Well setback: minimum 15m (SSR s.3.1).',
    inspection_frequency_months: 6,
    display_order: 4,
  },
];

interface ClassificationForm {
  classification_code: string;
  classification_name: string;
  description: string;
  treatment_level: string;
  dispersal_method: string;
  requires_disinfection: boolean;
  requires_additional_treatment: boolean;
  effluent_quality_standard: string;
  regulatory_body: string;
  regulatory_reference: string;
  typical_components: string[];
  maintenance_requirements: string;
  inspection_frequency_months: number;
  display_order: number;
}

const emptyForm: ClassificationForm = {
  classification_code: '',
  classification_name: '',
  description: '',
  treatment_level: '',
  dispersal_method: '',
  requires_disinfection: false,
  requires_additional_treatment: false,
  effluent_quality_standard: '',
  regulatory_body: '',
  regulatory_reference: '',
  typical_components: [],
  maintenance_requirements: '',
  inspection_frequency_months: 12,
  display_order: 0,
};

export default function SystemRegulationsTab() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState('BC');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassificationForm>({ ...emptyForm });
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [componentsInput, setComponentsInput] = useState('');

  const { data: classifications = [], isLoading } = useQuery({
    queryKey: ['septic-regulatory-classifications', shopId, selectedRegion],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_regulatory_classifications' as any)
        .select('*')
        .eq('shop_id', shopId)
        .eq('province_state', selectedRegion)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: ClassificationForm) => {
      if (!shopId) throw new Error('No shop ID');
      const country = PROVINCES_STATES[0].items.some(i => i.value === selectedRegion) ? 'CA' : 'US';
      const payload = {
        ...formData,
        shop_id: shopId,
        province_state: selectedRegion,
        country,
      };

      if (editingId) {
        const { error } = await supabase
          .from('septic_regulatory_classifications' as any)
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('septic_regulatory_classifications' as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-regulatory-classifications'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      toast.success(editingId ? 'Classification updated' : 'Classification added');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('septic_regulatory_classifications' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-regulatory-classifications'] });
      toast.success('Classification removed');
    },
  });

  const seedBCMutation = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop ID');
      const records = BC_DEFAULTS.map(d => ({
        ...d,
        shop_id: shopId,
        province_state: 'BC',
        country: 'CA',
      }));
      const { error } = await supabase
        .from('septic_regulatory_classifications' as any)
        .insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-regulatory-classifications'] });
      toast.success('BC system classifications loaded');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to load BC defaults');
    },
  });

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      classification_code: item.classification_code,
      classification_name: item.classification_name,
      description: item.description || '',
      treatment_level: item.treatment_level || '',
      dispersal_method: item.dispersal_method || '',
      requires_disinfection: item.requires_disinfection || false,
      requires_additional_treatment: item.requires_additional_treatment || false,
      effluent_quality_standard: item.effluent_quality_standard || '',
      regulatory_body: item.regulatory_body || '',
      regulatory_reference: item.regulatory_reference || '',
      typical_components: item.typical_components || [],
      maintenance_requirements: item.maintenance_requirements || '',
      inspection_frequency_months: item.inspection_frequency_months || 12,
      display_order: item.display_order || 0,
    });
    setComponentsInput((item.typical_components || []).join(', '));
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setComponentsInput('');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.classification_code || !form.classification_name) {
      toast.error('Code and name are required');
      return;
    }
    const components = componentsInput.split(',').map(s => s.trim()).filter(Boolean);
    saveMutation.mutate({ ...form, typical_components: components });
  };

  const regionLabel = PROVINCES_STATES.flatMap(g => g.items).find(i => i.value === selectedRegion)?.label || selectedRegion;

  const getTreatmentColor = (level: string) => {
    if (!level) return 'bg-muted text-muted-foreground';
    const l = level.toLowerCase();
    if (l.includes('none') || l.includes('storage')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    if (l.includes('primary')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    if (l.includes('secondary')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (l.includes('tertiary')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Region Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            <CardTitle>System Regulations by Region</CardTitle>
          </div>
          <CardDescription>
            Define septic system classifications per province or state. Each region has its own regulatory requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Select Province / State</Label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES_STATES.map(group => (
                    <React.Fragment key={group.group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        — {group.group} —
                      </div>
                      {group.items.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.value} — {item.label}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-end">
              <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Classification
              </Button>
              {selectedRegion === 'BC' && classifications.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => seedBCMutation.mutate()}
                  disabled={seedBCMutation.isPending}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  {seedBCMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Load BC Defaults
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BC Reference Document */}
      {selectedRegion === 'BC' && (
        <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Public Health Act — Sewerage System Regulation</p>
                <p className="text-xs text-muted-foreground">B.C. Reg. 326/2004 • Last amended March 30, 2022 • Consolidated to November 10, 2022</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="shrink-0"
              >
                <a href={BC_REGULATION_PDF} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  View PDF
                </a>
              </Button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground space-y-1 pl-[52px]">
              <p>• <strong>Applies to:</strong> Holding tanks, single family/duplex sewerage systems, and systems with combined flow &lt; 22,700 L/day (SSR s.2)</p>
              <p>• <strong>Well setbacks:</strong> Holding tanks ≥ 15m, Sewerage systems ≥ 30m from wells (SSR s.3.1)</p>
              <p>• <strong>Type 1 &amp; 2:</strong> May be constructed by ROWPs or professionals (SSR s.6)</p>
              <p>• <strong>Type 3 &amp; systems &gt; 9,100 L/day:</strong> Must be supervised by a professional (SSR s.6(3))</p>
              <p>• <strong>Filing required:</strong> Plans/specs must be filed with health authority before construction (SSR s.8)</p>
              <p>• <strong>Certification:</strong> Letter of certification required within 30 days of completing construction (SSR s.9)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : classifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-lg">No Classifications for {regionLabel}</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {selectedRegion === 'BC'
                ? 'Click "Load BC Defaults" to populate British Columbia system types automatically.'
                : 'Add system classifications specific to this region\'s regulations.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(classifications as any[]).map((item) => {
            const isExpanded = expandedCard === item.id;
            return (
              <Card key={item.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedCard(isExpanded ? null : item.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{item.classification_name}</span>
                      <Badge variant="outline" className="text-xs font-mono">{item.classification_code}</Badge>
                      <Badge className={`text-xs ${getTreatmentColor(item.treatment_level)}`}>
                        {item.treatment_level || 'Unknown'}
                      </Badge>
                      {item.requires_disinfection && (
                        <Badge variant="secondary" className="text-xs">
                          <FlaskConical className="h-3 w-3 mr-1" />
                          Disinfection
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 bg-muted/10 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Dispersal Method</Label>
                        <p className="text-sm font-medium">{item.dispersal_method || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Effluent Quality Standard</Label>
                        <p className="text-sm font-medium">{item.effluent_quality_standard || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Regulatory Body</Label>
                        <p className="text-sm font-medium">{item.regulatory_body || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Regulatory Reference</Label>
                        <p className="text-sm font-medium">{item.regulatory_reference || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Inspection Frequency</Label>
                        <p className="text-sm font-medium">
                          {item.inspection_frequency_months
                            ? `Every ${item.inspection_frequency_months} month${item.inspection_frequency_months !== 1 ? 's' : ''}`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Additional Treatment</Label>
                        <p className="text-sm font-medium">
                          {item.requires_additional_treatment ? 'Required' : 'Not required'}
                        </p>
                      </div>
                    </div>

                    {item.typical_components?.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Typical Components</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {item.typical_components.map((c: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.maintenance_requirements && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Maintenance Requirements</Label>
                        <p className="text-sm bg-background rounded-md p-3 border">{item.maintenance_requirements}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} System Classification — {regionLabel}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Classification Code *</Label>
                  <Input
                    value={form.classification_code}
                    onChange={e => setForm(f => ({ ...f, classification_code: e.target.value }))}
                    placeholder="e.g. TYPE_1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={form.display_order}
                    onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Classification Name *</Label>
                <Input
                  value={form.classification_name}
                  onChange={e => setForm(f => ({ ...f, classification_name: e.target.value }))}
                  placeholder="e.g. Type 1 — Septic Tank Treatment"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the system type and its typical use..."
                  rows={3}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Treatment Level</Label>
                  <Select value={form.treatment_level} onValueChange={v => setForm(f => ({ ...f, treatment_level: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None (Storage Only)">None (Storage Only)</SelectItem>
                      <SelectItem value="Primary">Primary</SelectItem>
                      <SelectItem value="Secondary">Secondary</SelectItem>
                      <SelectItem value="Tertiary">Tertiary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inspection Frequency (months)</Label>
                  <Input
                    type="number"
                    value={form.inspection_frequency_months}
                    onChange={e => setForm(f => ({ ...f, inspection_frequency_months: parseInt(e.target.value) || 12 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dispersal Method</Label>
                <Input
                  value={form.dispersal_method}
                  onChange={e => setForm(f => ({ ...f, dispersal_method: e.target.value }))}
                  placeholder="e.g. Gravity or pumped dispersal field"
                />
              </div>

              <div className="space-y-2">
                <Label>Effluent Quality Standard</Label>
                <Input
                  value={form.effluent_quality_standard}
                  onChange={e => setForm(f => ({ ...f, effluent_quality_standard: e.target.value }))}
                  placeholder="e.g. BOD ≤ 45 mg/L, TSS ≤ 45 mg/L"
                />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.requires_disinfection}
                    onCheckedChange={v => setForm(f => ({ ...f, requires_disinfection: v }))}
                  />
                  <Label>Requires Disinfection</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.requires_additional_treatment}
                    onCheckedChange={v => setForm(f => ({ ...f, requires_additional_treatment: v }))}
                  />
                  <Label>Additional Treatment Required</Label>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Regulatory Body</Label>
                  <Input
                    value={form.regulatory_body}
                    onChange={e => setForm(f => ({ ...f, regulatory_body: e.target.value }))}
                    placeholder="e.g. BC Ministry of Health"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regulatory Reference</Label>
                  <Input
                    value={form.regulatory_reference}
                    onChange={e => setForm(f => ({ ...f, regulatory_reference: e.target.value }))}
                    placeholder="e.g. SSR B.C. Reg. 326/2004"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Typical Components (comma-separated)</Label>
                <Input
                  value={componentsInput}
                  onChange={e => setComponentsInput(e.target.value)}
                  placeholder="Septic Tank, Distribution Box, Dispersal Field"
                />
              </div>

              <div className="space-y-2">
                <Label>Maintenance Requirements</Label>
                <Textarea
                  value={form.maintenance_requirements}
                  onChange={e => setForm(f => ({ ...f, maintenance_requirements: e.target.value }))}
                  placeholder="Describe ongoing maintenance..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingId ? 'Update' : 'Add'} Classification
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
