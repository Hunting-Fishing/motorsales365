import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDepartments } from '@/hooks/team/useDepartments';
import { toast } from '@/hooks/use-toast';

const departmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  description: z.string().optional(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

export function DepartmentManager() {
  const { departments, isLoading, addDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const [editingDepartment, setEditingDepartment] = useState<typeof departments[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      if (editingDepartment) {
        const success = await updateDepartment(editingDepartment.id, data.name, data.description);
        if (success) {
          toast({
            title: "Success",
            description: "Department updated successfully.",
          });
          setIsDialogOpen(false);
          setEditingDepartment(null);
          form.reset();
        }
      } else {
        const result = await addDepartment(data.name, data.description);
        if (result) {
          toast({
            title: "Success",
            description: "Department created successfully.",
          });
          setIsDialogOpen(false);
          form.reset();
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (department: typeof departments[0]) => {
    setEditingDepartment(department);
    form.setValue('name', department.name);
    form.setValue('description', department.description || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      const success = await deleteDepartment(id);
      if (success) {
        toast({
          title: "Success",
          description: "Department deleted successfully.",
        });
      }
    }
  };

  const resetForm = () => {
    setEditingDepartment(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Department Management</h3>
          <p className="text-sm text-muted-foreground">
            Organize your team members into departments for better management.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? 'Edit Department' : 'Add Department'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Field Service" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the department..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDepartment ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {departments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>No departments found. Create your first department to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          departments.map((department) => (
            <Card key={department.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{department.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(department)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(department.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {department.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {department.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}