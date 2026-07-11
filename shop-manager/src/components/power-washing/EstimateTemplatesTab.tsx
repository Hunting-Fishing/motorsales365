import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Save,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface EstimateTemplate {
  id: string;
  name: string;
  description: string | null;
  default_services: string[];
  default_notes: string | null;
  pricing_rules: any;
  is_active: boolean;
}

const SERVICE_OPTIONS = [
  'house_washing',
  'driveway_cleaning',
  'deck_patio',
  'roof_cleaning',
  'gutter_cleaning',
  'fence_cleaning',
  'commercial_building',
  'sidewalk_cleaning',
];

export function EstimateTemplatesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EstimateTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_services: [] as string[],
    default_notes: '',
    is_active: true,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['power-washing-estimate-templates', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.shop_id) return [];

      const { data, error } = await supabase
        .from('power_washing_estimate_templates')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.shop_id) throw new Error('No shop found');

      if (data.id) {
        const { error } = await supabase
          .from('power_washing_estimate_templates')
          .update({
            name: data.name,
            description: data.description || null,
            default_services: data.default_services,
            default_notes: data.default_notes || null,
            is_active: data.is_active,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('power_washing_estimate_templates')
          .insert({
            shop_id: profile.shop_id,
            name: data.name,
            description: data.description || null,
            default_services: data.default_services,
            default_notes: data.default_notes || null,
            is_active: data.is_active,
            created_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-estimate-templates'] });
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to save template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_washing_estimate_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-estimate-templates'] });
      toast.success('Template deleted');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      default_services: [],
      default_notes: '',
      is_active: true,
    });
    setEditingTemplate(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (template: EstimateTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      default_services: template.default_services || [],
      default_notes: template.default_notes || '',
      is_active: template.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingTemplate?.id,
    });
  };

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      default_services: prev.default_services.includes(service)
        ? prev.default_services.filter(s => s !== service)
        : [...prev.default_services, service],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Estimate Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create reusable templates for faster quoting
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard House Wash"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this template"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Default Services</Label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((service) => (
                    <Badge
                      key={service}
                      variant={formData.default_services.includes(service) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleService(service)}
                    >
                      {service.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Default Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.default_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_notes: e.target.value }))}
                  placeholder="Default notes to include in quotes"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Create templates to speed up your quoting process
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{template.name}</h4>
                      {!template.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                    {template.default_services?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.default_services.map((service) => (
                          <Badge key={service} variant="outline" className="text-xs">
                            {service.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
