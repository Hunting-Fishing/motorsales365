import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ClipboardCheck, FileText, Copy, Trash2, Eye, Pencil, Loader2, Download, PlayCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import InspectionFormEditor from './InspectionFormEditor';
import InspectionFormPreview from './InspectionFormPreview';

interface TemplateListItem {
  id: string;
  name: string;
  description: string | null;
  is_published: boolean | null;
  version: number | null;
  created_at: string;
  section_count: number;
  item_count: number;
}

const BC_DEFAULT_TEMPLATE = {
  name: 'Septic Tank Inspection Checklist',
  description: 'Standard septic system inspection checklist based on BC guidelines',
  sections: [
    {
      title: 'Inspection Preparation',
      description: 'Safety and preparation checks before beginning inspection',
      items: [
        { item_name: 'Inspector wearing rubber gloves and eye protection', response_type: 'checkbox', is_required: true },
        { item_name: 'Inspector has tools and materials necessary', response_type: 'checkbox', is_required: true },
        { item_name: 'Safety rules reviewed', response_type: 'checkbox', is_required: true },
        { item_name: 'If necessary, inspect with another person for safety', response_type: 'checkbox', is_required: false },
        { item_name: 'Avoid touching face during inspection', response_type: 'checkbox', is_required: true },
      ],
    },
    {
      title: 'Septic Tank Checklist',
      description: 'Main inspection points for the septic tank system',
      items: [
        { item_name: 'Wastewater directed into sewage treatment system', response_type: 'pass_fail_na' },
        { item_name: 'Water not backing up and drains flow freely', response_type: 'pass_fail_na' },
        { item_name: 'Risers watertight and without leaks', response_type: 'pass_fail_na' },
        { item_name: 'Risers no visible damage', response_type: 'pass_fail_na' },
        { item_name: 'Tank odor levels acceptable', response_type: 'pass_fail_na' },
        { item_name: 'Liquid level above outlet pipe', response_type: 'pass_fail_na' },
        { item_name: 'Healthy scum layer in tank', response_type: 'pass_fail_na' },
        { item_name: 'Scum layer no more than 6 inches depth', response_type: 'pass_fail_na' },
        { item_name: 'Sludge layer no more than 12 inches depth', response_type: 'pass_fail_na' },
        { item_name: 'Signs of overflow', response_type: 'pass_fail_na' },
        { item_name: 'Scum layer below inlet', response_type: 'pass_fail_na' },
        { item_name: 'Baffles above scum layer', response_type: 'pass_fail_na' },
        { item_name: 'Clean outlet baffle filter', response_type: 'pass_fail_na' },
        { item_name: 'Diverter box above ground level', response_type: 'pass_fail_na' },
        { item_name: 'Diverter in place with lid', response_type: 'pass_fail_na' },
        { item_name: 'Ground around system — surface sewage', response_type: 'pass_fail_na' },
      ],
    },
    {
      title: 'Measurements',
      description: 'Record physical measurements',
      items: [
        { item_name: 'Scum Layer Thickness', response_type: 'number', unit: 'inches' },
        { item_name: 'Sludge Layer Thickness', response_type: 'number', unit: 'inches' },
      ],
    },
    {
      title: 'Notes',
      description: 'General inspection notes and observations',
      items: [
        { item_name: 'General Inspection Notes', response_type: 'text', allows_notes: true, allows_photos: true, allows_videos: true },
      ],
    },
  ],
};

export default function InspectionFormBuilderTab() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['septic-inspection-templates', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_inspection_templates')
        .select(`
          id, name, description, is_published, version, created_at,
          septic_inspection_template_sections(
            id,
            septic_inspection_template_items(id)
          )
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        is_published: t.is_published,
        version: t.version,
        created_at: t.created_at,
        section_count: t.septic_inspection_template_sections?.length || 0,
        item_count: t.septic_inspection_template_sections?.reduce(
          (acc: number, s: any) => acc + (s.septic_inspection_template_items?.length || 0), 0
        ) || 0,
      })) as TemplateListItem[];
    },
    enabled: !!shopId,
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from('septic_inspection_templates')
        .update({ is_published: !published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-inspection-templates'] });
      toast.success('Template updated');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      // Delete items first, then sections, then template
      const { data: sections } = await supabase
        .from('septic_inspection_template_sections')
        .select('id')
        .eq('template_id', id);

      if (sections?.length) {
        const sectionIds = sections.map(s => s.id);
        await supabase
          .from('septic_inspection_template_items')
          .delete()
          .in('section_id', sectionIds);
        await supabase
          .from('septic_inspection_template_sections')
          .delete()
          .eq('template_id', id);
      }

      const { error } = await supabase
        .from('septic_inspection_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-inspection-templates'] });
      toast.success('Template deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete template'),
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (id: string) => {
      // Load full template
      const { data: tmpl } = await supabase
        .from('septic_inspection_templates')
        .select('*')
        .eq('id', id)
        .single();
      if (!tmpl) throw new Error('Not found');

      const { data: newTmpl, error: tErr } = await supabase
        .from('septic_inspection_templates')
        .insert({
          shop_id: tmpl.shop_id,
          name: `${tmpl.name} (Copy)`,
          description: tmpl.description,
          asset_type: tmpl.asset_type,
          is_published: false,
          version: 1,
          created_by: tmpl.created_by,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      const { data: sections } = await supabase
        .from('septic_inspection_template_sections')
        .select('*')
        .eq('template_id', id)
        .order('display_order');

      for (const sec of sections || []) {
        const { data: newSec } = await supabase
          .from('septic_inspection_template_sections')
          .insert({
            template_id: newTmpl.id,
            title: sec.title,
            description: sec.description,
            display_order: sec.display_order,
          })
          .select()
          .single();

        if (newSec) {
          const { data: items } = await supabase
            .from('septic_inspection_template_items')
            .select('*')
            .eq('section_id', sec.id)
            .order('display_order');

          if (items?.length) {
            await supabase
              .from('septic_inspection_template_items')
              .insert(
                items.map(item => ({
                  section_id: newSec.id,
                  item_name: item.item_name,
                  item_key: item.item_key,
                  item_type: item.item_type,
                  description: item.description,
                  is_required: item.is_required,
                  display_order: item.display_order,
                  default_value: item.default_value,
                  unit: item.unit,
                  allows_notes: (item as any).allows_notes,
                  allows_photos: (item as any).allows_photos,
                  allows_videos: (item as any).allows_videos,
                  response_type: (item as any).response_type,
                }))
              );
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-inspection-templates'] });
      toast.success('Template duplicated');
    },
    onError: () => toast.error('Failed to duplicate'),
  });

  const loadDefault = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const { data: user } = await supabase.auth.getUser();

      const { data: tmpl, error: tErr } = await supabase
        .from('septic_inspection_templates')
        .insert({
          shop_id: shopId,
          name: BC_DEFAULT_TEMPLATE.name,
          description: BC_DEFAULT_TEMPLATE.description,
          asset_type: 'septic_system',
          is_published: true,
          version: 1,
          created_by: user.user?.id || null,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      for (let si = 0; si < BC_DEFAULT_TEMPLATE.sections.length; si++) {
        const sec = BC_DEFAULT_TEMPLATE.sections[si];
        const { data: newSec } = await supabase
          .from('septic_inspection_template_sections')
          .insert({
            template_id: tmpl.id,
            title: sec.title,
            description: sec.description,
            display_order: si,
          })
          .select()
          .single();

        if (newSec) {
          await supabase
            .from('septic_inspection_template_items')
            .insert(
              sec.items.map((item, ii) => ({
                section_id: newSec.id,
                item_name: item.item_name,
                item_key: item.item_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50),
                item_type: item.response_type === 'pass_fail_na' ? 'checkbox' : item.response_type === 'number' ? 'number' : item.response_type === 'text' ? 'text' : 'checkbox',
                is_required: (item as any).is_required ?? false,
                display_order: ii,
                response_type: item.response_type,
                allows_notes: (item as any).allows_notes ?? true,
                allows_photos: (item as any).allows_photos ?? true,
                allows_videos: (item as any).allows_videos ?? false,
                unit: (item as any).unit || null,
              }))
            );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-inspection-templates'] });
      toast.success('BC default checklist loaded');
    },
    onError: (e) => { console.error(e); toast.error('Failed to load default'); },
  });

  // Auto-seed BC default when shop has zero templates
  const [autoSeeded, setAutoSeeded] = React.useState(false);
  React.useEffect(() => {
    if (templates && templates.length === 0 && !autoSeeded && !loadDefault.isPending && shopId) {
      setAutoSeeded(true);
      loadDefault.mutate();
    }
  }, [templates, autoSeeded, shopId]);

  // Show editor
  if (editingTemplateId || isCreating) {
    return (
      <InspectionFormEditor
        templateId={editingTemplateId}
        shopId={shopId}
        onClose={() => { setEditingTemplateId(null); setIsCreating(false); }}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['septic-inspection-templates'] });
          setEditingTemplateId(null);
          setIsCreating(false);
        }}
      />
    );
  }

  // Show preview
  if (previewTemplateId) {
    return (
      <InspectionFormPreview
        templateId={previewTemplateId}
        onClose={() => setPreviewTemplateId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <CardTitle>Inspection Forms</CardTitle>
                <CardDescription>Create and manage inspection checklists for your business</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Form
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !templates?.length ? (
            <div className="text-center py-12 space-y-3">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">No inspection forms yet</p>
              <p className="text-sm text-muted-foreground">Create a new form or load the BC default checklist to get started.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((t) => (
                <div key={t.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{t.name}</h3>
                      <Badge variant={t.is_published ? 'default' : 'secondary'} className="text-xs">
                        {t.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    {t.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{t.description}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{t.section_count} sections</span>
                      <span>{t.item_count} items</span>
                      <span>v{t.version || 1}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => navigate(`/septic/inspection-form/${t.id}`)} title="Use Form">
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTemplateId(t.id)} title="Preview">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTemplateId(t.id)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateTemplate.mutate(t.id)} title="Duplicate">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => togglePublish.mutate({ id: t.id, published: !!t.is_published })}
                    >
                      {t.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(t.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection Form</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this form template and all its sections and items. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && deleteTemplate.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
