import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, ClipboardCheck, AlertTriangle, Wrench, MessageSquare, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SepticInspectionFormTemplate from '@/components/septic/inspection/SepticInspectionFormTemplate';

interface SepticInspectionFormCardProps {
  inspection: any;
  orderId: string;
  isCompleted?: boolean;
}

const conditionOptions = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'na', label: 'N/A' },
];

export default function SepticInspectionFormCard({ inspection, orderId, isCompleted = false }: SepticInspectionFormCardProps) {
  const queryClient = useQueryClient();
  const [newMaintItem, setNewMaintItem] = useState('');
  const [newPart, setNewPart] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['septic-order-inspections', orderId] });

  // Fetch template sections when template_id is present
  const { data: templateData, isLoading: templateLoading } = useQuery({
    queryKey: ['septic-inspection-template-sections', inspection.template_id],
    queryFn: async () => {
      const { data: tmpl } = await supabase
        .from('septic_inspection_templates')
        .select('*')
        .eq('id', inspection.template_id)
        .single();

      const { data: secs } = await supabase
        .from('septic_inspection_template_sections')
        .select('*')
        .eq('template_id', inspection.template_id)
        .order('display_order');

      const sectionsWithItems = [];
      for (const sec of secs || []) {
        const { data: items } = await supabase
          .from('septic_inspection_template_items')
          .select('*')
          .eq('section_id', sec.id)
          .order('display_order');
        sectionsWithItems.push({ ...sec, items: items || [] });
      }

      return { template: tmpl, sections: sectionsWithItems };
    },
    enabled: !!inspection.template_id,
  });

  // Initialize form values from saved inspection_data
  const savedData = inspection.inspection_data || {};
  const [formValues, setFormValues] = useState<Record<string, any>>(savedData.values || {});
  const [headerValues, setHeaderValues] = useState({
    location: savedData.location || '',
    date: savedData.date || inspection.inspection_date || new Date().toISOString().split('T')[0],
    assignedTo: savedData.assignedTo || inspection.inspector_name || '',
    signedBy: savedData.signedBy || null,
  });

  // Auto-save debounced
  const persistData = useCallback((vals: Record<string, any>, header: any) => {
    if (isCompleted) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const payload = {
        values: vals,
        location: header.location,
        date: header.date,
        assignedTo: header.assignedTo,
        signedBy: header.signedBy,
      };
      await supabase
        .from('septic_inspections' as any)
        .update({ inspection_data: payload })
        .eq('id', inspection.id);
    }, 800);
  }, [inspection.id, isCompleted]);

  const handleValuesChange = useCallback((vals: Record<string, any>) => {
    setFormValues(vals);
    persistData(vals, headerValues);
  }, [persistData, headerValues]);

  const handleHeaderChange = useCallback((header: any) => {
    setHeaderValues(header);
    persistData(formValues, header);
  }, [persistData, formValues]);

  // Complete inspection mutation
  const completeInspection = useMutation({
    mutationFn: async () => {
      const payload = {
        values: formValues,
        location: headerValues.location,
        date: headerValues.date,
        assignedTo: headerValues.assignedTo,
        signedBy: headerValues.signedBy,
      };
      const { error } = await supabase
        .from('septic_inspections' as any)
        .update({
          inspection_data: payload,
          departed_at: new Date().toISOString(),
          inspector_name: headerValues.assignedTo,
        })
        .eq('id', inspection.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Inspection completed & saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Generic field update for non-template inspections
  const updateField = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from('septic_inspections' as any)
        .update({ [field]: value })
        .eq('id', inspection.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  // If template_id exists, render the styled template form
  if (inspection.template_id) {
    if (templateLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!templateData?.sections?.length) {
      return (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Template sections not found. The template may have been deleted.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <SepticInspectionFormTemplate
          templateName={templateData.template?.name || ''}
          templateDescription={templateData.template?.description || undefined}
          sections={templateData.sections}
          interactive={!isCompleted}
          values={formValues}
          headerValues={headerValues}
          onValuesChange={handleValuesChange}
          onHeaderChange={handleHeaderChange}
          onPrint={() => window.print()}
        />

        {/* Additional fields below the template */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Work Performed</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe work performed..."
                defaultValue={inspection.work_performed || ''}
                onBlur={(e) => !isCompleted && updateField.mutate({ field: 'work_performed', value: e.target.value })}
                rows={3}
                disabled={isCompleted}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" /> Customer Remarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Customer notes, concerns, or requests..."
                defaultValue={inspection.customer_remarks || ''}
                onBlur={(e) => !isCompleted && updateField.mutate({ field: 'customer_remarks', value: e.target.value })}
                rows={3}
                disabled={isCompleted}
              />
            </CardContent>
          </Card>
        </div>

        {/* Complete button */}
        {!isCompleted && (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => completeInspection.mutate()}
            disabled={completeInspection.isPending}
          >
            {completeInspection.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Complete & Save Inspection
          </Button>
        )}

        {isCompleted && (
          <p className="text-xs text-muted-foreground text-center">
            ✅ Completed {inspection.departed_at ? format(new Date(inspection.departed_at), 'MMM d, yyyy h:mm a') : ''}
          </p>
        )}
      </div>
    );
  }

  // ---- FALLBACK: Blank / no-template inspection (original generic form) ----
  const maintItems: string[] = Array.isArray(inspection.maintenance_items) ? inspection.maintenance_items : [];
  const partsReq: string[] = Array.isArray(inspection.parts_requested) ? inspection.parts_requested : [];

  const addMaintenanceItem = () => {
    if (!newMaintItem.trim()) return;
    updateField.mutate({ field: 'maintenance_items', value: [...maintItems, newMaintItem.trim()] });
    setNewMaintItem('');
  };

  const removeMaintenanceItem = (index: number) => {
    const next = [...maintItems];
    next.splice(index, 1);
    updateField.mutate({ field: 'maintenance_items', value: next });
  };

  const addPart = () => {
    if (!newPart.trim()) return;
    updateField.mutate({ field: 'parts_requested', value: [...partsReq, newPart.trim()] });
    setNewPart('');
  };

  const removePart = (index: number) => {
    const next = [...partsReq];
    next.splice(index, 1);
    updateField.mutate({ field: 'parts_requested', value: next });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" /> System Condition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'overall_condition', label: 'Overall' },
              { key: 'tank_condition', label: 'Tank' },
              { key: 'drain_field_condition', label: 'Drain Field' },
              { key: 'baffle_condition', label: 'Baffle' },
              { key: 'effluent_filter_condition', label: 'Effluent Filter' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Select
                  value={inspection[key] || ''}
                  onValueChange={(val) => !isCompleted && updateField.mutate({ field: key, value: val })}
                  disabled={isCompleted}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" /> Maintenance Items Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {maintItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {maintItems.map((item, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {item}
                  {!isCompleted && (
                    <button onClick={() => removeMaintenanceItem(i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
          {!isCompleted && (
            <div className="flex gap-2">
              <Input
                placeholder="Add maintenance item..."
                value={newMaintItem}
                onChange={(e) => setNewMaintItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMaintenanceItem()}
                className="h-9"
              />
              <Button size="sm" variant="outline" onClick={addMaintenanceItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" /> Parts & Equipment Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {partsReq.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {partsReq.map((item, i) => (
                <Badge key={i} variant="outline" className="gap-1 pr-1">
                  {item}
                  {!isCompleted && (
                    <button onClick={() => removePart(i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
          {!isCompleted && (
            <div className="flex gap-2">
              <Input
                placeholder="Add part or equipment..."
                value={newPart}
                onChange={(e) => setNewPart(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPart()}
                className="h-9"
              />
              <Button size="sm" variant="outline" onClick={addPart}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Work Performed</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Describe work performed..."
              defaultValue={inspection.work_performed || ''}
              onBlur={(e) => !isCompleted && updateField.mutate({ field: 'work_performed', value: e.target.value })}
              rows={4}
              disabled={isCompleted}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Customer Remarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Customer notes, concerns, or requests..."
              defaultValue={inspection.customer_remarks || ''}
              onBlur={(e) => !isCompleted && updateField.mutate({ field: 'customer_remarks', value: e.target.value })}
              rows={4}
              disabled={isCompleted}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inspector Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="General inspection notes..."
            defaultValue={inspection.notes || ''}
            onBlur={(e) => !isCompleted && updateField.mutate({ field: 'notes', value: e.target.value })}
            rows={3}
            disabled={isCompleted}
          />
        </CardContent>
      </Card>

      {!isCompleted && (
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => completeInspection.mutate()}
          disabled={completeInspection.isPending}
        >
          {completeInspection.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Complete & Save Inspection
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-right">
        {isCompleted ? (
          <>✅ Completed {inspection.departed_at ? format(new Date(inspection.departed_at), 'MMM d, yyyy h:mm a') : ''}</>
        ) : (
          <>Started {inspection.arrived_at ? format(new Date(inspection.arrived_at), 'MMM d, yyyy h:mm a') : inspection.inspection_date || '—'}</>
        )}
      </p>
    </div>
  );
}
