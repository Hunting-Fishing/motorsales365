import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, HeartPulse, Search, Trash2, Shield, AlertTriangle, CheckCircle, Globe, BookOpen, ChevronDown, ChevronUp, X, User, Stethoscope, MapPin, Weight, ClipboardList, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useICD10Search, mapICD10Category } from '@/hooks/useICD10Search';
import SafeExerciseRecommendations from './SafeExerciseRecommendations';

interface Props {
  clientId: string;
  shopId: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  moderate: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  severe: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  managed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const SEVERITY_DOT: Record<string, string> = {
  mild: 'bg-green-500',
  moderate: 'bg-amber-500',
  severe: 'bg-red-500',
  managed: 'bg-blue-500',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  chronic: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  monitoring: <Shield className="h-3.5 w-3.5 text-blue-500" />,
  recovered: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
};

const ALL_EXERCISE_RESTRICTIONS = [
  'no_overhead', 'no_heavy_squats', 'no_running', 'no_twisting', 'avoid_impact',
  'no_jumping', 'no_heavy_deadlifts', 'no_bench_press', 'no_pull_ups',
  'limit_range_of_motion', 'no_contact_sports', 'no_prolonged_standing',
  'no_spinal_loading', 'no_lateral_movements', 'no_plyometrics',
  'low_intensity_only', 'seated_exercises_only', 'no_grip_heavy',
];

const ALL_DIETARY_IMPLICATIONS = [
  'low_sodium', 'low_sugar', 'high_protein', 'anti_inflammatory',
  'gluten_free', 'dairy_free', 'low_fat', 'high_fiber',
  'iron_rich', 'calcium_rich', 'vitamin_d', 'omega_3',
  'low_potassium', 'low_purine', 'hydration_focus',
];

export default function ClientMedicalProfile({ clientId, shopId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [icd10Search, setIcd10Search] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingCondition, setEditingCondition] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('catalog');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const { results: icd10Results, isLoading: icd10Loading } = useICD10Search(icd10Search);

  const toggleExpanded = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Fetch client's conditions
  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ['pt-client-medical', clientId, shopId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_client_medical_conditions')
        .select('*')
        .eq('client_id', clientId)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && !!shopId,
  });

  // Fetch catalog
  const { data: catalog = [] } = useQuery({
    queryKey: ['pt-medical-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_medical_condition_catalog')
        .select('*')
        .order('category, name');
      if (error) throw error;
      return data || [];
    },
  });

  const categories = [...new Set(catalog.map((c: any) => c.category))];

  const filteredCatalog = catalog.filter((c: any) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !selectedCategory || c.category === selectedCategory;
    const notAlreadyAdded = !conditions.some((ex: any) => ex.condition_code === c.code);
    return matchSearch && matchCategory && notAlreadyAdded;
  });

  const filteredIcd10 = icd10Results.filter(
    r => !conditions.some((ex: any) => ex.condition_code === r.code)
  );

  const addCondition = useMutation({
    mutationFn: async (catalogItem: any) => {
      const { error } = await (supabase as any).from('pt_client_medical_conditions').insert({
        client_id: clientId,
        shop_id: shopId,
        condition_code: catalogItem.code,
        condition_name: catalogItem.name,
        category: catalogItem.category,
        severity: 'moderate',
        status: 'active',
        exercise_restrictions: catalogItem.default_restrictions || [],
        dietary_implications: catalogItem.default_dietary_implications || [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-medical', clientId] });
      toast({ title: 'Condition added' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addIcd10Condition = useMutation({
    mutationFn: async (item: { code: string; name: string }) => {
      const catalogMatch = catalog.find((c: any) =>
        c.name.toLowerCase() === item.name.toLowerCase() ||
        c.code === item.code
      );

      const { error } = await (supabase as any).from('pt_client_medical_conditions').insert({
        client_id: clientId,
        shop_id: shopId,
        condition_code: item.code,
        condition_name: item.name,
        category: catalogMatch?.category || mapICD10Category(item.code),
        severity: 'moderate',
        status: 'active',
        exercise_restrictions: catalogMatch?.default_restrictions || [],
        dietary_implications: catalogMatch?.default_dietary_implications || [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-medical', clientId] });
      toast({ title: 'Condition added from ICD-10' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateCondition = useMutation({
    mutationFn: async (update: any) => {
      const { id, ...fields } = update;
      const { error } = await (supabase as any).from('pt_client_medical_conditions')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-medical', clientId] });
      toast({ title: 'Condition updated' });
      setEditingCondition(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const removeCondition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('pt_client_medical_conditions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-medical', clientId] });
      toast({ title: 'Condition removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleRestriction = (restriction: string) => {
    setEditingCondition((prev: any) => {
      const current = prev.exercise_restrictions || [];
      const updated = current.includes(restriction)
        ? current.filter((r: string) => r !== restriction)
        : [...current, restriction];
      return { ...prev, exercise_restrictions: updated };
    });
  };

  const toggleDietary = (implication: string) => {
    setEditingCondition((prev: any) => {
      const current = prev.dietary_implications || [];
      const updated = current.includes(implication)
        ? current.filter((d: string) => d !== implication)
        : [...current, implication];
      return { ...prev, dietary_implications: updated };
    });
  };

  const activeCount = conditions.filter((c: any) => c.status === 'active' || c.status === 'chronic').length;

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-red-500" />
          <h3 className="font-semibold">Medical Conditions</h3>
          {activeCount > 0 && (
            <Badge variant="destructive" className="text-xs">{activeCount} active</Badge>
          )}
        </div>
        <Button size="sm" onClick={() => { setAddOpen(true); setActiveTab('catalog'); setSearch(''); setIcd10Search(''); }}>
          <Plus className="h-4 w-4 mr-1" />Add Condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          No medical conditions recorded. Click "Add Condition" to get started.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {conditions.map((cond: any) => {
            const isExpanded = expandedCards.has(cond.id);
            const hasDetails = (cond.exercise_restrictions?.length > 0) || (cond.dietary_implications?.length > 0) || cond.notes || cond.trainer_ai_notes || cond.diagnosed_date || cond.physician_restrictions || cond.affected_area;
            const restrictionExpired = cond.physician_restriction_until && new Date(cond.physician_restriction_until) < new Date();
            return (
              <Card key={cond.id} className="border-l-4" style={{
                borderLeftColor: cond.severity === 'severe' ? 'hsl(var(--destructive))' : 
                  cond.severity === 'moderate' ? 'hsl(38 92% 50%)' : 
                  cond.severity === 'managed' ? 'hsl(var(--primary))' : 'hsl(142 76% 36%)'
              }}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => hasDetails && toggleExpanded(cond.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        {STATUS_ICONS[cond.status] || null}
                        <span className="font-medium text-sm">
                          {cond.condition_name}
                          {cond.affected_area && <span className="text-muted-foreground font-normal"> — {cond.affected_area}</span>}
                        </span>
                        <Badge variant="outline" className="text-xs">{cond.category}</Badge>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${SEVERITY_COLORS[cond.severity] || ''}`}>
                          {cond.severity}
                        </span>
                        {cond.injury_grade && cond.injury_grade !== 'na' && (
                          <Badge variant="outline" className="text-[10px]">Grade {cond.injury_grade.replace('grade_', '')}</Badge>
                        )}
                        {cond.weight_limit_lbs && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5"><Weight className="h-2.5 w-2.5" /> Max {cond.weight_limit_lbs} lbs</Badge>
                        )}
                        {cond.physician_restrictions && (
                          <Badge variant="outline" className={`text-[10px] gap-0.5 ${restrictionExpired ? 'border-amber-500 text-amber-600' : 'border-blue-500 text-blue-600'}`}>
                            <ClipboardList className="h-2.5 w-2.5" />
                            {restrictionExpired ? '⚠️ Dr. orders expired' : `Dr. orders${cond.physician_restriction_until ? ` until ${new Date(cond.physician_restriction_until).toLocaleDateString()}` : ''}`}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{cond.status}</Badge>
                        {cond.cleared_by_physician && (
                          <Badge className="text-xs bg-green-600">✓ Cleared</Badge>
                        )}
                        {cond.condition_code && /^[A-Z]\d/.test(cond.condition_code) && (
                          <Badge variant="outline" className="text-[10px] font-mono">{cond.condition_code}</Badge>
                        )}
                        {/* Provenance badge */}
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          {cond.added_by === 'client' ? (
                            <><User className="h-2.5 w-2.5" /> Client</>
                          ) : (
                            <><Stethoscope className="h-2.5 w-2.5" /> Trainer</>
                          )}
                        </Badge>
                      </div>
                      {cond.diagnosed_date && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">Diagnosed: {new Date(cond.diagnosed_date).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {hasDetails && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleExpanded(cond.id)}>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit condition details" onClick={() => setEditingCondition({ ...cond })}>
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeCondition.mutate(cond.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {cond.physician_restrictions && (
                        <div className={`rounded-md p-2 ${restrictionExpired ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'}`}>
                          <p className="text-[11px] font-medium mb-1 flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" />
                            Doctor's Restrictions
                            {restrictionExpired && <span className="text-amber-600 font-semibold ml-1">— EXPIRED, review needed</span>}
                            {cond.physician_restriction_until && !restrictionExpired && <span className="text-muted-foreground font-normal ml-1">until {new Date(cond.physician_restriction_until).toLocaleDateString()}</span>}
                          </p>
                          <p className="text-xs">{cond.physician_restrictions}</p>
                        </div>
                      )}
                      {(cond.exercise_restrictions?.length > 0) && (
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground mb-1">Exercise Restrictions</p>
                          <div className="flex flex-wrap gap-1">
                            {cond.exercise_restrictions.map((r: string) => (
                              <Badge key={r} variant="destructive" className="text-[10px] px-1.5">{r.replace(/_/g, ' ')}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {(cond.dietary_implications?.length > 0) && (
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground mb-1">Dietary Implications</p>
                          <div className="flex flex-wrap gap-1">
                            {cond.dietary_implications.map((d: string) => (
                              <Badge key={d} variant="secondary" className="text-[10px] px-1.5">🍎 {d.replace(/_/g, ' ')}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {cond.notes && (
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground mb-1">Notes</p>
                          <p className="text-xs text-muted-foreground">{cond.notes}</p>
                        </div>
                      )}
                      {cond.trainer_ai_notes && (
                        <div className="bg-muted/50 rounded-md p-2">
                          <p className="text-[11px] font-medium text-muted-foreground mb-1">🤖 Trainer Notes for AI</p>
                          <p className="text-xs">{cond.trainer_ai_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Safe Exercise Recommendations */}
      {conditions.length > 0 && (
        <SafeExerciseRecommendations
          shopId={shopId}
          restrictions={[]}
          conditions={conditions.map((c: any) => ({
            condition_name: c.condition_name,
            exercise_restrictions: c.exercise_restrictions || [],
          }))}
        />
      )}

      {/* Add Condition Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Add Medical Condition</DialogTitle></DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="catalog" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />Our Catalog
              </TabsTrigger>
              <TabsTrigger value="icd10" className="gap-1.5">
                <Globe className="h-3.5 w-3.5" />ICD-10 Database
              </TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="flex-1 flex flex-col min-h-0 mt-3">
              <div className="space-y-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search conditions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={!selectedCategory ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setSelectedCategory(null)}>All</Badge>
                  {categories.map((cat: string) => (
                    <Badge key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setSelectedCategory(cat)}>{cat}</Badge>
                  ))}
                </div>
              </div>
              <div className="mt-3 overflow-y-auto overscroll-contain" style={{ maxHeight: '50vh' }}>
                <div className="space-y-1 pr-1">
                  {filteredCatalog.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => addCondition.mutate(item)}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category} · {item.description}</p>
                      </div>
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  ))}
                  {filteredCatalog.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No matching conditions</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="icd10" className="flex-1 flex flex-col min-h-0 mt-3">
              <div className="space-y-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search ICD-10 medical database..." 
                    value={icd10Search} 
                    onChange={e => setIcd10Search(e.target.value)} 
                    className="pl-9" 
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Search thousands of standardized medical conditions via the NLM Clinical Tables API. Results include ICD-10-CM codes.
                </p>
              </div>
              <div className="mt-3 overflow-y-auto overscroll-contain" style={{ maxHeight: '50vh' }}>
                <div className="space-y-1 pr-3">
                  {icd10Loading && (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!icd10Loading && filteredIcd10.map((item) => {
                    const hasCatalogMatch = catalog.some((c: any) =>
                      c.name.toLowerCase() === item.name.toLowerCase() || c.code === item.code
                    );
                    return (
                      <div 
                        key={item.code} 
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer" 
                        onClick={() => addIcd10Condition.mutate(item)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{item.name}</p>
                            {hasCatalogMatch && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">Has defaults</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{item.code}</span> · {mapICD10Category(item.code)}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    );
                  })}
                  {!icd10Loading && icd10Search.length >= 2 && filteredIcd10.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No matching ICD-10 conditions</p>
                  )}
                  {!icd10Loading && icd10Search.length < 2 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Type at least 2 characters to search</p>
                  )}
                  {!icd10Loading && filteredIcd10.length > 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-2 border-t mt-2">
                      ⚠️ Conditions without a catalog match will have no default restrictions — set them manually after adding.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Condition Dialog */}
      <Dialog open={!!editingCondition} onOpenChange={(open) => !open && setEditingCondition(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full shrink-0 ${SEVERITY_DOT[editingCondition?.severity] || 'bg-muted'}`} />
              Edit: {editingCondition?.condition_name}
              {editingCondition?.added_by && (
                <Badge variant="outline" className="text-[10px] ml-auto gap-0.5 font-normal">
                  {editingCondition.added_by === 'client' ? (
                    <><User className="h-2.5 w-2.5" /> Client reported</>
                  ) : (
                    <><Stethoscope className="h-2.5 w-2.5" /> Trainer added</>
                  )}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {editingCondition && (
            <ScrollArea className="flex-1 min-h-0 pr-3" style={{ maxHeight: '65vh' }}>
              <div className="space-y-4 pb-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Severity</Label>
                    <Select value={editingCondition.severity} onValueChange={v => setEditingCondition((p: any) => ({ ...p, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                        <SelectItem value="managed">Managed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editingCondition.status} onValueChange={v => setEditingCondition((p: any) => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="chronic">Chronic</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="recovered">Recovered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Diagnosed Date</Label>
                  <Input type="date" value={editingCondition.diagnosed_date || ''} onChange={e => setEditingCondition((p: any) => ({ ...p, diagnosed_date: e.target.value || null }))} />
                </div>

                {/* Condition Detail Section */}
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Condition Detail</p>
                  
                  <div>
                    <Label className="text-xs">Affected Area / Location</Label>
                    <Input 
                      value={editingCondition.affected_area || ''} 
                      onChange={e => setEditingCondition((p: any) => ({ ...p, affected_area: e.target.value }))} 
                      placeholder={
                        editingCondition.category === 'Musculoskeletal' ? 'e.g., L4-L5 disc, Left ACL, Right rotator cuff' :
                        editingCondition.category === 'Cardiovascular' ? 'e.g., Left ventricle, Mitral valve' :
                        'e.g., specific location or body part'
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Injury Grade</Label>
                      <Select value={editingCondition.injury_grade || 'na'} onValueChange={v => setEditingCondition((p: any) => ({ ...p, injury_grade: v === 'na' ? null : v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="na">N/A</SelectItem>
                          <SelectItem value="grade_1">Grade 1 — Mild / Strain</SelectItem>
                          <SelectItem value="grade_2">Grade 2 — Moderate / Partial</SelectItem>
                          <SelectItem value="grade_3">Grade 3 — Severe / Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Weight Limit (lbs)</Label>
                      <Input 
                        type="number" 
                        value={editingCondition.weight_limit_lbs || ''} 
                        onChange={e => setEditingCondition((p: any) => ({ ...p, weight_limit_lbs: e.target.value ? parseInt(e.target.value) : null }))} 
                        placeholder="No limit if empty"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-2">
                    <Label className="text-xs flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-blue-600" /> Doctor's Restrictions</Label>
                    <Textarea 
                      value={editingCondition.physician_restrictions || ''} 
                      onChange={e => setEditingCondition((p: any) => ({ ...p, physician_restrictions: e.target.value }))} 
                      rows={3} 
                      placeholder="Enter physician-imposed limitations, e.g., No spinal loading for 8 weeks, limit flexion to 30 degrees..."
                      className="bg-background"
                    />
                    <div>
                      <Label className="text-xs">Restriction Valid Until</Label>
                      <Input 
                        type="date" 
                        value={editingCondition.physician_restriction_until || ''} 
                        onChange={e => setEditingCondition((p: any) => ({ ...p, physician_restriction_until: e.target.value || null }))} 
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">When this date passes, a review reminder will appear on the card.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea value={editingCondition.notes || ''} onChange={e => setEditingCondition((p: any) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional notes for the trainer..." />
                </div>

                {/* Trainer Notes for AI */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">🤖 Trainer Notes for AI</Label>
                  <p className="text-[11px] text-muted-foreground">These notes are injected into AI workout generation to ensure safe programming.</p>
                  <Textarea 
                    value={editingCondition.trainer_ai_notes || ''} 
                    onChange={e => setEditingCondition((p: any) => ({ ...p, trainer_ai_notes: e.target.value }))} 
                    rows={3} 
                    placeholder="e.g. Client has left shoulder impingement — avoid overhead pressing beyond 90°. Focus on rotator cuff strengthening." 
                    className="bg-background"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={editingCondition.cleared_by_physician || false} onCheckedChange={v => setEditingCondition((p: any) => ({ ...p, cleared_by_physician: v, clearance_date: v ? new Date().toISOString().split('T')[0] : null }))} />
                    <Label className="text-sm">Cleared by Physician</Label>
                  </div>
                  {editingCondition.cleared_by_physician && (
                    <Input type="date" className="w-36" value={editingCondition.clearance_date || ''} onChange={e => setEditingCondition((p: any) => ({ ...p, clearance_date: e.target.value }))} />
                  )}
                </div>

                {/* Editable Exercise Restrictions */}
                <div>
                  <Label className="text-sm">Exercise Restrictions</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">Tap to add/remove restrictions. Active restrictions are highlighted.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_EXERCISE_RESTRICTIONS.map((r) => {
                      const isActive = (editingCondition.exercise_restrictions || []).includes(r);
                      return (
                        <Badge
                          key={r}
                          variant={isActive ? 'destructive' : 'outline'}
                          className={`text-[11px] cursor-pointer transition-colors ${isActive ? '' : 'opacity-60 hover:opacity-100'}`}
                          onClick={() => toggleRestriction(r)}
                        >
                          {isActive && <X className="h-2.5 w-2.5 mr-0.5" />}
                          {r.replace(/_/g, ' ')}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Editable Dietary Implications */}
                <div>
                  <Label className="text-sm">Dietary Implications</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">Tap to add/remove dietary flags.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DIETARY_IMPLICATIONS.map((d) => {
                      const isActive = (editingCondition.dietary_implications || []).includes(d);
                      return (
                        <Badge
                          key={d}
                          variant={isActive ? 'default' : 'outline'}
                          className={`text-[11px] cursor-pointer transition-colors ${isActive ? '' : 'opacity-60 hover:opacity-100'}`}
                          onClick={() => toggleDietary(d)}
                        >
                          {isActive && <X className="h-2.5 w-2.5 mr-0.5" />}
                          🍎 {d.replace(/_/g, ' ')}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <Button className="w-full" disabled={updateCondition.isPending} onClick={() => updateCondition.mutate(editingCondition)}>
                  {updateCondition.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
