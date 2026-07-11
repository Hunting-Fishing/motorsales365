import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardCheck, Plus, ChevronDown, ChevronRight, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import SepticInspectionFormCard from './SepticInspectionFormCard';

interface SepticOrderInspectionTabProps {
  orderId: string;
  shopId: string | null;
  customerId: string | null;
}

export default function SepticOrderInspectionTab({ orderId, shopId, customerId }: SepticOrderInspectionTabProps) {
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Fetch ALL inspections for this order
  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['septic-order-inspections', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_inspections' as any)
        .select('*')
        .eq('service_order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!orderId,
  });

  // Fetch templates for selector
  const { data: templates = [] } = useQuery({
    queryKey: ['septic-inspection-templates-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_inspection_templates')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Create inspection
  const createInspection = useMutation({
    mutationFn: async (templateId?: string) => {
      const templateName = templateId
        ? templates.find((t: any) => t.id === templateId)?.name
        : undefined;
      const payload: any = {
        shop_id: shopId,
        service_order_id: orderId,
        inspection_date: new Date().toISOString().split('T')[0],
        inspector_name: '',
        overall_condition: 'good',
        maintenance_items: [],
        parts_requested: [],
        inspection_data: {},
        arrived_at: new Date().toISOString(),
      };
      if (templateId) payload.template_id = templateId;
      const { data, error } = await supabase
        .from('septic_inspections' as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['septic-order-inspections', orderId] });
      // Auto-expand the newly created inspection
      setExpandedIds((prev) => new Set(prev).add(data.id));
      toast.success('Inspection created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete inspection
  const deleteInspection = useMutation({
    mutationFn: async (inspectionId: string) => {
      const { error } = await supabase
        .from('septic_inspections' as any)
        .delete()
        .eq('id', inspectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-order-inspections', orderId] });
      toast.success('Inspection removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTemplateName = (templateId?: string) => {
    if (!templateId) return 'Blank Inspection';
    const t = templates.find((t: any) => t.id === templateId);
    return t?.name || 'Custom Template';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add new inspection controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground mr-auto">
              {inspections.length === 0
                ? 'No inspections yet — start one below'
                : `${inspections.length} inspection${inspections.length !== 1 ? 's' : ''} on file`}
            </p>
            {templates.length > 0 && (
              <Select onValueChange={(val) => createInspection.mutate(val)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Add from template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => createInspection.mutate(undefined)}
              disabled={createInspection.isPending}
            >
              {createInspection.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Blank Inspection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List of inspections — each collapsible */}
      {inspections.map((insp: any) => {
        const isOpen = expandedIds.has(insp.id);
        return (
          <Card key={insp.id} className="overflow-hidden">
            {/* Collapsible header */}
            <button
              onClick={() => toggleExpand(insp.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getTemplateName(insp.template_id)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {insp.inspection_date
                    ? format(new Date(insp.inspection_date), 'MMM d, yyyy')
                    : 'No date'}
                  {insp.overall_condition && (
                    <> · <span className="capitalize">{insp.overall_condition}</span></>
                  )}
                </p>
              </div>
              {insp.departed_at ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  ✅ Completed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  In Progress
                </Badge>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Inspection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this inspection and all its data. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteInspection.mutate(insp.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </button>

            {/* Expanded form */}
            {isOpen && (
              <div className="border-t px-4 py-4">
                <SepticInspectionFormCard
                  inspection={insp}
                  orderId={orderId}
                  isCompleted={!!insp.departed_at}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
