import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectBudget } from "@/types/projectBudget";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SaveAsTemplateDialogProps {
  project: ProjectBudget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SaveAsTemplateDialog = ({ project, open, onOpenChange }: SaveAsTemplateDialogProps) => {
  const [name, setName] = useState(`${project.project_name} Template`);
  const [description, setDescription] = useState('');
  const [includeAmounts, setIncludeAmounts] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.shop_id) {
        toast.error('Unable to determine shop');
        return;
      }

      // Build template data
      const templateData = {
        project_type: project.project_type,
        priority: project.priority,
        contingency_percent: project.contingency_percent,
        requires_approval: project.requires_approval,
        approval_threshold: project.approval_threshold,
        phases: project.phases?.map(phase => ({
          phase_name: phase.phase_name,
          phase_order: phase.phase_order,
          description: phase.description,
          phase_budget: includeAmounts ? phase.phase_budget : 0,
          is_milestone: phase.is_milestone,
          color: phase.color,
        })) || [],
        cost_categories: [...new Set(project.cost_items?.map(item => item.category) || [])],
        cost_items: includeAmounts ? project.cost_items?.map(item => ({
          category: item.category,
          description: item.description,
          budgeted_amount: item.budgeted_amount,
        })) : [],
      };

      const { error } = await supabase
        .from('project_templates')
        .insert({
          shop_id: profile.shop_id,
          name: name.trim(),
          description: description.trim() || null,
          template_data: templateData,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('Template saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-amounts"
              checked={includeAmounts}
              onCheckedChange={(checked) => setIncludeAmounts(checked as boolean)}
            />
            <Label htmlFor="include-amounts" className="text-sm text-muted-foreground">
              Include budget amounts (otherwise just structure)
            </Label>
          </div>

          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium mb-2">Template will include:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Project type: {project.project_type}</li>
              <li>• {project.phases?.length || 0} phases</li>
              <li>• {[...new Set(project.cost_items?.map(i => i.category) || [])].length} cost categories</li>
              <li>• Contingency: {project.contingency_percent}%</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
