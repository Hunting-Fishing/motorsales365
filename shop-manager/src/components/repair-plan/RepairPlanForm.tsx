
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { RepairPlanFormValues, RepairTask } from "@/types/repairPlan";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { Equipment } from "@/types/equipment";
import { RepairPlanFormHeader } from "./form/RepairPlanFormHeader";
import { RepairPlanBasicInfoFields } from "./form/RepairPlanBasicInfoFields";
import { RepairPlanStatusFields } from "./form/RepairPlanStatusFields";
import { RepairPlanDetailsFields } from "./form/RepairPlanDetailsFields";
import { RepairPlanTasksSection } from "./form/RepairPlanTasksSection";
import { RepairPlanFormActions } from "./form/RepairPlanFormActions";

// Form schema validation (excluding tasks field as it's handled separately)
const repairPlanSchema = z.object({
  equipmentId: z.string().min(1, "Equipment is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  status: z.enum(["draft", "scheduled", "in-progress", "completed", "cancelled"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  scheduledDate: z.date().optional(),
  estimatedDuration: z.number().min(0.5, "Duration must be at least 0.5 hours"),
  assignedTechnician: z.string().optional(),
  costEstimate: z.number().optional(),
  customerApproved: z.boolean().default(false),
  notes: z.string().optional(),
  tasks: z.array(z.any()).default([]), // Tasks handled separately
  partsRequired: z.array(z.string()).optional(),
});

interface RepairPlanFormProps {
  equipmentList: Equipment[];
  technicians: string[];
  onSubmit: (values: RepairPlanFormValues) => void;
  initialValues?: Partial<RepairPlanFormValues>;
}

export function RepairPlanForm({ 
  equipmentList, 
  technicians, 
  onSubmit, 
  initialValues 
}: RepairPlanFormProps) {
  const [tasks, setTasks] = useState<RepairTask[]>(initialValues?.tasks || []);
  
  const form = useForm({
    resolver: zodResolver(repairPlanSchema),
    defaultValues: {
      equipmentId: initialValues?.equipmentId || "",
      title: initialValues?.title || "",
      description: initialValues?.description || "",
      status: initialValues?.status || "draft",
      priority: initialValues?.priority || "medium",
      scheduledDate: initialValues?.scheduledDate,
      estimatedDuration: initialValues?.estimatedDuration || 1,
      assignedTechnician: initialValues?.assignedTechnician || "",
      costEstimate: initialValues?.costEstimate || 0,
      customerApproved: initialValues?.customerApproved || false,
      notes: initialValues?.notes || "",
    },
  });

  const handleAddTask = () => {
    const newTask: RepairTask = {
      id: uuidv4(),
      description: "",
      estimatedHours: 1,
      completed: false,
    };
    setTasks([...tasks, newTask]);
  };

  const handleUpdateTask = (updatedTask: RepairTask) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleFormSubmit = (values: any) => {
    // Combine form values with tasks
    const formData = {
      ...values,
      tasks,
    };
    
    if (tasks.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one task to the repair plan",
        variant: "destructive",
      });
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <Card>
      <RepairPlanFormHeader />
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <RepairPlanBasicInfoFields form={form as any} equipmentList={equipmentList} />
            <RepairPlanStatusFields form={form as any} />
            <RepairPlanDetailsFields form={form as any} technicians={technicians} />
            <RepairPlanTasksSection 
              tasks={tasks}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onRemoveTask={handleRemoveTask}
              technicians={technicians}
            />
            <RepairPlanFormActions />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
