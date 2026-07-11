import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useProjectBudgets } from '@/hooks/useProjectBudgets';
import { PROJECT_TYPES } from '@/types/projectBudget';
import { ProjectTemplateSelector } from './ProjectTemplateSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, X } from 'lucide-react';

const formSchema = z.object({
  project_name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  project_type: z.string().min(1, 'Project type is required'),
  priority: z.string().default('medium'),
  original_budget: z.number().min(0, 'Budget must be positive'),
  contingency_percent: z.number().min(0).max(100).default(10),
  planned_start_date: z.string().optional(),
  planned_end_date: z.string().optional(),
  requires_approval: z.boolean().default(true),
  approval_threshold: z.number().default(10000),
});

type FormData = z.infer<typeof formSchema>;

interface ProjectTemplate {
  id: string;
  name: string;
  project_type?: string;
  priority?: string;
  contingency_percent?: number;
  requires_approval?: boolean;
  approval_threshold?: number;
  template_data?: {
    phases?: Array<{
      phase_name: string;
      phase_order: number;
      planned_budget?: number;
      description?: string;
    }>;
  };
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { createProject } = useProjectBudgets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplateSheet, setShowTemplateSheet] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [pendingPhases, setPendingPhases] = useState<ProjectTemplate['template_data']['phases']>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_name: '',
      description: '',
      project_type: 'maintenance',
      priority: 'medium',
      original_budget: 0,
      contingency_percent: 10,
      planned_start_date: '',
      planned_end_date: '',
      requires_approval: true,
      approval_threshold: 10000,
    },
  });

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    
    // Pre-populate form fields from template
    if (template.project_type) form.setValue('project_type', template.project_type);
    if (template.priority) form.setValue('priority', template.priority);
    if (template.contingency_percent !== undefined) form.setValue('contingency_percent', template.contingency_percent);
    if (template.requires_approval !== undefined) form.setValue('requires_approval', template.requires_approval);
    if (template.approval_threshold !== undefined) form.setValue('approval_threshold', template.approval_threshold);
    
    // Store phases for later creation
    if (template.template_data?.phases) {
      setPendingPhases(template.template_data.phases);
    }
    
    setShowTemplateSheet(false);
    toast.success(`Template "${template.name}" applied`);
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setPendingPhases([]);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const contingencyAmount = (data.original_budget * data.contingency_percent) / 100;
      const newProject = await createProject.mutateAsync({
        ...data,
        contingency_amount: contingencyAmount,
        current_budget: data.original_budget + contingencyAmount,
      });

      // Auto-create phases from template if any
      if (pendingPhases && pendingPhases.length > 0 && newProject?.id) {
        const phasesToInsert = pendingPhases.map(phase => ({
          project_id: newProject.id,
          phase_name: phase.phase_name,
          phase_order: phase.phase_order,
          planned_budget: phase.planned_budget || 0,
          description: phase.description || null,
          status: 'pending',
        }));

        const { error: phaseError } = await supabase
          .from('project_phases')
          .insert(phasesToInsert);

        if (phaseError) {
          console.error('Failed to create template phases:', phaseError);
          toast.error('Project created but failed to add template phases');
        } else {
          toast.success(`Created project with ${phasesToInsert.length} phases from template`);
        }
      }

      form.reset();
      setSelectedTemplate(null);
      setPendingPhases([]);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new project budget with phases and cost tracking
              </DialogDescription>
            </div>
            <Sheet open={showTemplateSheet} onOpenChange={setShowTemplateSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Select Template</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <ProjectTemplateSelector onSelect={handleTemplateSelect} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {selectedTemplate && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                From: {selectedTemplate.name}
                <button onClick={clearTemplate} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
              {pendingPhases && pendingPhases.length > 0 && (
                <Badge variant="outline">{pendingPhases.length} phases</Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="project_name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Engine Overhaul - Vessel A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Project description and scope..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="original_budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contingency_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contingency %</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2 border-t pt-4">
                <h4 className="font-medium mb-4">Approval Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="requires_approval"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Approval</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Project must be approved before starting
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="approval_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approval Threshold</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10000"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Changes above this amount require approval
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
