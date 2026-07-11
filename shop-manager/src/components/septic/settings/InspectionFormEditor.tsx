import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Save, Loader2, Camera, Video, StickyNote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditorItem {
  id?: string;
  item_name: string;
  item_key: string;
  item_type: string;
  response_type: string;
  description: string;
  is_required: boolean;
  display_order: number;
  unit: string;
  allows_notes: boolean;
  allows_photos: boolean;
  allows_videos: boolean;
  default_value: string;
}

interface EditorSection {
  id?: string;
  title: string;
  description: string;
  display_order: number;
  items: EditorItem[];
  isOpen: boolean;
}

interface Props {
  templateId: string | null;
  shopId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const RESPONSE_TYPES = [
  { value: 'pass_fail_na', label: '✓ / ✗ / N/A' },
  { value: 'gyr_status', label: 'Green / Yellow / Red' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
];

function generateKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50);
}

function newItem(order: number): EditorItem {
  return {
    item_name: '',
    item_key: '',
    item_type: 'checkbox',
    response_type: 'pass_fail_na',
    description: '',
    is_required: false,
    display_order: order,
    unit: '',
    allows_notes: true,
    allows_photos: true,
    allows_videos: false,
    default_value: '',
  };
}

export default function InspectionFormEditor({ templateId, shopId, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!templateId) {
      setSections([{ title: 'Section 1', description: '', display_order: 0, items: [newItem(0)], isOpen: true }]);
      return;
    }
    loadTemplate();
  }, [templateId]);

  async function loadTemplate() {
    setLoading(true);
    try {
      const { data: tmpl } = await supabase
        .from('septic_inspection_templates')
        .select('*')
        .eq('id', templateId!)
        .single();

      if (!tmpl) { toast.error('Template not found'); onClose(); return; }
      setName(tmpl.name);
      setDescription(tmpl.description || '');

      const { data: secs } = await supabase
        .from('septic_inspection_template_sections')
        .select('*')
        .eq('template_id', templateId!)
        .order('display_order');

      const editorSections: EditorSection[] = [];
      for (const sec of secs || []) {
        const { data: items } = await supabase
          .from('septic_inspection_template_items')
          .select('*')
          .eq('section_id', sec.id)
          .order('display_order');

        editorSections.push({
          id: sec.id,
          title: sec.title,
          description: sec.description || '',
          display_order: sec.display_order,
          isOpen: true,
          items: (items || []).map((item: any) => ({
            id: item.id,
            item_name: item.item_name,
            item_key: item.item_key,
            item_type: item.item_type || 'checkbox',
            response_type: item.response_type || 'pass_fail_na',
            description: item.description || '',
            is_required: item.is_required ?? false,
            display_order: item.display_order,
            unit: item.unit || '',
            allows_notes: item.allows_notes ?? true,
            allows_photos: item.allows_photos ?? true,
            allows_videos: item.allows_videos ?? false,
            default_value: item.default_value || '',
          })),
        });
      }
      if (!editorSections.length) {
        editorSections.push({ title: 'Section 1', description: '', display_order: 0, items: [newItem(0)], isOpen: true });
      }
      setSections(editorSections);
    } finally {
      setLoading(false);
    }
  }

  function updateSection(idx: number, patch: Partial<EditorSection>) {
    setSections(s => s.map((sec, i) => i === idx ? { ...sec, ...patch } : sec));
  }

  function updateItem(secIdx: number, itemIdx: number, patch: Partial<EditorItem>) {
    setSections(s => s.map((sec, si) => si === secIdx ? {
      ...sec,
      items: sec.items.map((it, ii) => ii === itemIdx ? { ...it, ...patch } : it),
    } : sec));
  }

  function addSection() {
    setSections(s => [...s, {
      title: `Section ${s.length + 1}`,
      description: '',
      display_order: s.length,
      items: [newItem(0)],
      isOpen: true,
    }]);
  }

  function removeSection(idx: number) {
    if (sections.length <= 1) { toast.error('Must have at least one section'); return; }
    setSections(s => s.filter((_, i) => i !== idx).map((sec, i) => ({ ...sec, display_order: i })));
  }

  function addItem(secIdx: number) {
    setSections(s => s.map((sec, i) => i === secIdx ? {
      ...sec,
      items: [...sec.items, newItem(sec.items.length)],
    } : sec));
  }

  function removeItem(secIdx: number, itemIdx: number) {
    setSections(s => s.map((sec, si) => si === secIdx ? {
      ...sec,
      items: sec.items.filter((_, ii) => ii !== itemIdx).map((it, ii) => ({ ...it, display_order: ii })),
    } : sec));
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Form name is required'); return; }
    if (!shopId) { toast.error('Shop not found'); return; }
    setSaving(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      let tmplId = templateId;

      if (tmplId) {
        const { error } = await supabase
          .from('septic_inspection_templates')
          .update({ name, description: description || null })
          .eq('id', tmplId);
        if (error) throw error;

        // Delete existing sections and items
        const { data: oldSecs } = await supabase
          .from('septic_inspection_template_sections')
          .select('id')
          .eq('template_id', tmplId);
        if (oldSecs?.length) {
          await supabase.from('septic_inspection_template_items').delete().in('section_id', oldSecs.map(s => s.id));
          await supabase.from('septic_inspection_template_sections').delete().eq('template_id', tmplId);
        }
      } else {
        const { data: newTmpl, error } = await supabase
          .from('septic_inspection_templates')
          .insert({
            shop_id: shopId,
            name,
            description: description || null,
            asset_type: 'septic_system',
            is_published: false,
            version: 1,
            created_by: user.user?.id || null,
          })
          .select()
          .single();
        if (error) throw error;
        tmplId = newTmpl.id;
      }

      // Insert sections and items
      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        const { data: newSec, error: secErr } = await supabase
          .from('septic_inspection_template_sections')
          .insert({
            template_id: tmplId!,
            title: sec.title,
            description: sec.description || null,
            display_order: si,
          })
          .select()
          .single();
        if (secErr) throw secErr;

        const validItems = sec.items.filter(it => it.item_name.trim());
        if (validItems.length && newSec) {
          const { error: itemErr } = await supabase
            .from('septic_inspection_template_items')
            .insert(
              validItems.map((item, ii) => ({
                section_id: newSec.id,
                item_name: item.item_name,
                item_key: item.item_key || generateKey(item.item_name),
                item_type: item.response_type === 'number' ? 'number' : item.response_type === 'text' ? 'text' : 'checkbox',
                description: item.description || null,
                is_required: item.is_required,
                display_order: ii,
                unit: item.unit || null,
                default_value: item.default_value || null,
                allows_notes: item.allows_notes,
                allows_photos: item.allows_photos,
                allows_videos: item.allows_videos,
                response_type: item.response_type,
              }))
            );
          if (itemErr) throw itemErr;
        }
      }

      toast.success(templateId ? 'Form updated' : 'Form created');
      onSaved();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold">{templateId ? 'Edit' : 'Create'} Inspection Form</h2>
      </div>

      {/* Form Name & Description */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Form Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Septic Tank Inspection Checklist" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this form inspect?" rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {sections.map((sec, si) => (
        <Card key={si}>
          <Collapsible open={sec.isOpen} onOpenChange={(open) => updateSection(si, { isOpen: open })}>
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    {sec.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <Input
                  value={sec.title}
                  onChange={e => updateSection(si, { title: e.target.value })}
                  className="font-semibold border-none shadow-none px-1 h-8 text-base focus-visible:ring-1"
                  placeholder="Section title"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSection(si)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                <Input
                  value={sec.description}
                  onChange={e => updateSection(si, { description: e.target.value })}
                  placeholder="Section description (optional)"
                  className="text-sm"
                />

                {/* Items */}
                <div className="space-y-2">
                  {sec.items.map((item, ii) => (
                    <div key={ii} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-2.5 cursor-grab flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Input
                            value={item.item_name}
                            onChange={e => {
                              updateItem(si, ii, { item_name: e.target.value, item_key: generateKey(e.target.value) });
                            }}
                            placeholder="Checklist item name"
                            className="text-sm"
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            <Select
                              value={item.response_type}
                              onValueChange={v => updateItem(si, ii, { response_type: v })}
                            >
                              <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RESPONSE_TYPES.map(rt => (
                                  <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {item.response_type === 'number' && (
                              <Input
                                value={item.unit}
                                onChange={e => updateItem(si, ii, { unit: e.target.value })}
                                placeholder="Unit"
                                className="w-20 h-8 text-xs"
                              />
                            )}

                            <div className="flex items-center gap-1">
                              <Switch
                                checked={item.is_required}
                                onCheckedChange={v => updateItem(si, ii, { is_required: v })}
                                className="scale-75"
                              />
                              <span className="text-xs text-muted-foreground">Required</span>
                            </div>

                            <Button
                              variant={item.allows_notes ? 'default' : 'outline'}
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateItem(si, ii, { allows_notes: !item.allows_notes })}
                              title="Allow Notes"
                            >
                              <StickyNote className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant={item.allows_photos ? 'default' : 'outline'}
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateItem(si, ii, { allows_photos: !item.allows_photos })}
                              title="Allow Photos"
                            >
                              <Camera className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant={item.allows_videos ? 'default' : 'outline'}
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateItem(si, ii, { allows_videos: !item.allows_videos })}
                              title="Allow Videos"
                            >
                              <Video className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => removeItem(si, ii)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" onClick={() => addItem(si)} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      <Button variant="outline" onClick={addSection} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>

      {/* Save / Cancel */}
      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {templateId ? 'Update Form' : 'Create Form'}
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
