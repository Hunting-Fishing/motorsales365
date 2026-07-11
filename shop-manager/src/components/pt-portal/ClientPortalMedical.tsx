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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, HeartPulse, Search, Trash2, AlertTriangle, CheckCircle, Shield, Globe, BookOpen, UserCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useICD10Search, mapICD10Category } from '@/hooks/useICD10Search';

interface Props {
  clientId: string;
  shopId: string;
  currentUserId: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  moderate: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  severe: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  managed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  chronic: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  monitoring: <Shield className="h-3.5 w-3.5 text-blue-500" />,
  recovered: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
};

export default function ClientPortalMedical({ clientId, shopId, currentUserId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [icd10Search, setIcd10Search] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingCondition, setEditingCondition] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('catalog');

  const { results: icd10Results, isLoading: icd10Loading } = useICD10Search(icd10Search);

  // Fetch client's conditions
  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ['pt-client-medical-portal', clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_client_medical_conditions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
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
        added_by: 'client',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-medical-portal', clientId] });
      toast({ title: 'Condition added ✅', description: 'Your trainer will be notified.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addIcd10Condition = useMutation({
    mutationFn: async (item: { code: string; name: string }) => {
      const catalogMatch = catalog.find((c: any) =>
        c.name.toLowerCase() === item.name.toLowerCase() || c.code === item.code
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
        added_by: 'client',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-medical-portal', clientId] });
      toast({ title: 'Condition added from ICD-10 ✅', description: 'Your trainer will review this.' });
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
      queryClient.invalidateQueries({ queryKey: ['pt-client-medical-portal', clientId] });
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
      queryClient.invalidateQueries({ queryKey: ['pt-client-medical-portal', clientId] });
      toast({ title: 'Condition removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const activeConditions = conditions.filter((c: any) => c.status === 'active' || c.status === 'chronic');
  const allRestrictions = [...new Set(conditions.flatMap((c: any) => c.exercise_restrictions || []))];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-red-500" />
          <h3 className="font-semibold text-lg">My Health Profile</h3>
        </div>
        <Button size="sm" onClick={() => { setAddOpen(true); setActiveTab('catalog'); setSearch(''); setIcd10Search(''); }}>
          <Plus className="h-4 w-4 mr-1" />Report Condition
        </Button>
      </div>

      {/* Status summary */}
      {conditions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeConditions.length > 0 && (
            <Badge variant="destructive" className="text-xs">{activeConditions.length} active condition{activeConditions.length > 1 ? 's' : ''}</Badge>
          )}
          {allRestrictions.slice(0, 5).map((r, i) => (
            <Badge key={String(r) + i} variant="outline" className="text-xs text-destructive border-destructive/30">
              ⚠️ {(r as string).replace(/_/g, ' ')}
            </Badge>
          ))}
          {allRestrictions.length > 5 && (
            <Badge variant="outline" className="text-xs">+{allRestrictions.length - 5} more</Badge>
          )}
        </div>
      )}

      {/* Info note */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardContent className="p-3 text-xs text-muted-foreground flex items-start gap-2">
          <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <span>
            Report your medical conditions, injuries, or limitations here. Your trainer and our AI system will automatically adjust your programs to keep you safe. Conditions marked by your trainer cannot be removed.
          </span>
        </CardContent>
      </Card>

      {/* Conditions List */}
      {conditions.length === 0 ? (
        <Card><CardContent className="py-12 text-center space-y-2">
          <HeartPulse className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No medical conditions reported yet.</p>
          <p className="text-xs text-muted-foreground">Tap "Report Condition" to add any injuries, conditions, or limitations.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {conditions.map((cond: any, idx: number) => {
            const isTrainerAdded = cond.added_by === 'trainer' || (!cond.added_by);
            return (
              <Card key={cond.id} className="border-l-4" style={{
                borderLeftColor: cond.severity === 'severe' ? 'hsl(var(--destructive))' :
                  cond.severity === 'moderate' ? 'hsl(38 92% 50%)' :
                  cond.severity === 'managed' ? 'hsl(var(--primary))' : 'hsl(142 76% 36%)'
              }}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {STATUS_ICONS[cond.status] || null}
                        <span className="font-medium text-sm">{cond.condition_name}</span>
                        <Badge variant="outline" className="text-xs">{cond.category}</Badge>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${SEVERITY_COLORS[cond.severity] || ''}`}>
                          {cond.severity}
                        </span>
                        {cond.condition_code && /^[A-Z]\d/.test(cond.condition_code) && (
                          <Badge variant="outline" className="text-[10px] font-mono">{cond.condition_code}</Badge>
                        )}
                        {isTrainerAdded && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5">
                            <UserCircle className="h-2.5 w-2.5" />Trainer
                          </Badge>
                        )}
                        {cond.cleared_by_physician && (
                          <Badge className="text-xs bg-green-600">✓ Cleared</Badge>
                        )}
                      </div>
                      {(cond.exercise_restrictions?.length > 0 || cond.dietary_implications?.length > 0) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(cond.exercise_restrictions || []).map((r: string) => (
                            <Badge key={r} variant="destructive" className="text-[10px] px-1.5">{r.replace(/_/g, ' ')}</Badge>
                          ))}
                          {(cond.dietary_implications || []).map((d: string) => (
                            <Badge key={d} variant="secondary" className="text-[10px] px-1.5">🍎 {d.replace(/_/g, ' ')}</Badge>
                          ))}
                        </div>
                      )}
                      {cond.notes && <p className="text-xs text-muted-foreground mt-1">{cond.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCondition({ ...cond })}>
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                      {!isTrainerAdded && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeCondition.mutate(cond.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Condition Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Report a Medical Condition</DialogTitle></DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="catalog" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />Common Conditions
              </TabsTrigger>
              <TabsTrigger value="icd10" className="gap-1.5">
                <Globe className="h-3.5 w-3.5" />Medical Database
              </TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="flex-1 flex flex-col min-h-0 mt-3">
              <div className="space-y-3">
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
              <ScrollArea className="flex-1 min-h-0 mt-3" style={{ maxHeight: '40vh' }}>
                <div className="space-y-1 pr-2">
                  {filteredCatalog.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer active:bg-muted transition-colors" onClick={() => addCondition.mutate(item)}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category} · {item.description}</p>
                      </div>
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  ))}
                  {filteredCatalog.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No matching conditions</p>}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="icd10" className="flex-1 flex flex-col min-h-0 mt-3">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search medical database (e.g. knee pain, diabetes)..."
                    value={icd10Search}
                    onChange={e => setIcd10Search(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Search thousands of standardized medical conditions. Results include ICD-10-CM codes for accurate tracking.
                </p>
              </div>
              <ScrollArea className="flex-1 min-h-0 mt-3" style={{ maxHeight: '40vh' }}>
                <div className="space-y-1 pr-2">
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
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer active:bg-muted transition-colors"
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
                    <p className="text-sm text-muted-foreground text-center py-4">No matching conditions found</p>
                  )}
                  {!icd10Loading && icd10Search.length < 2 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Type at least 2 characters to search</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Condition Dialog — client can edit severity, status, notes only */}
      <Dialog open={!!editingCondition} onOpenChange={(open) => !open && setEditingCondition(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Update Condition Details</DialogTitle></DialogHeader>
          {editingCondition && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{editingCondition.condition_name}</p>
                <p className="text-xs text-muted-foreground">{editingCondition.category}</p>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={editingCondition.severity} onValueChange={v => setEditingCondition((prev: any) => ({ ...prev, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="managed">Managed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingCondition.status} onValueChange={v => setEditingCondition((prev: any) => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="chronic">Chronic</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="recovered">Recovered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Describe symptoms, triggers, or anything your trainer should know..."
                  value={editingCondition.notes || ''}
                  onChange={e => setEditingCondition((prev: any) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Read-only display of restrictions set by trainer */}
              {(editingCondition.exercise_restrictions?.length > 0 || editingCondition.dietary_implications?.length > 0) && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Restrictions (set by trainer)</Label>
                  <div className="flex flex-wrap gap-1">
                    {(editingCondition.exercise_restrictions || []).map((r: string) => (
                      <Badge key={r} variant="destructive" className="text-[10px]">{r.replace(/_/g, ' ')}</Badge>
                    ))}
                    {(editingCondition.dietary_implications || []).map((d: string) => (
                      <Badge key={d} variant="secondary" className="text-[10px]">🍎 {d.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {editingCondition.cleared_by_physician && (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-700 dark:text-green-400">Cleared by physician</span>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => updateCondition.mutate({
                  id: editingCondition.id,
                  severity: editingCondition.severity,
                  status: editingCondition.status,
                  notes: editingCondition.notes,
                })}
                disabled={updateCondition.isPending}
              >
                {updateCondition.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
