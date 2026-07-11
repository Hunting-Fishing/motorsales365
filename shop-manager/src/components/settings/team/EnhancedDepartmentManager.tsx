import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Pencil, Trash2, Users, Search, Building2, Wrench, HeadphonesIcon, ShieldCheck, Calculator, Truck, Settings, UserCheck, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDepartmentMembers } from '@/hooks/team/useDepartmentMembers';
import { useDepartments } from '@/hooks/team/useDepartments';
import { toast } from '@/hooks/use-toast';
import { AssignUserDialog } from './AssignUserDialog';
const predefinedDepartments = [{
  name: 'Service Operations',
  description: 'Field technicians and on-site service staff',
  icon: Wrench,
  color: 'bg-blue-500/10 text-blue-700 border-blue-200'
}, {
  name: 'Customer Service',
  description: 'Customer support and reception team',
  icon: HeadphonesIcon,
  color: 'bg-green-500/10 text-green-700 border-green-200'
}, {
  name: 'Administration',
  description: 'Office and administrative staff',
  icon: Building2,
  color: 'bg-purple-500/10 text-purple-700 border-purple-200'
}, {
  name: 'Management',
  description: 'Leadership and management team',
  icon: UserCheck,
  color: 'bg-orange-500/10 text-orange-700 border-orange-200'
}, {
  name: 'Parts & Inventory',
  description: 'Parts management and inventory control',
  icon: Truck,
  color: 'bg-teal-500/10 text-teal-700 border-teal-200'
}, {
  name: 'Quality Control',
  description: 'Quality assurance and inspection',
  icon: ShieldCheck,
  color: 'bg-red-500/10 text-red-700 border-red-200'
}, {
  name: 'Finance & Accounting',
  description: 'Financial operations and accounting',
  icon: Calculator,
  color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200'
}, {
  name: 'IT & Technical Support',
  description: 'Information technology and technical support',
  icon: Settings,
  color: 'bg-gray-500/10 text-gray-700 border-gray-200'
}];
const departmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  description: z.string().optional(),
  predefinedDepartment: z.string().optional(),
  isCustom: z.boolean().default(false)
});
type DepartmentFormData = z.infer<typeof departmentSchema>;
export function EnhancedDepartmentManager() {
  const { departmentsWithMembers, isLoading, refetch } = useDepartmentMembers();
  const { addDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPredefined, setShowPredefined] = useState(true);
  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
      predefinedDepartment: '',
      isCustom: false
    }
  });
  const watchedPredefined = form.watch('predefinedDepartment');
  const isCustom = form.watch('isCustom');

  // Filter out already existing departments from predefined list
  const availablePredefined = predefinedDepartments.filter(pred => !departmentsWithMembers.some(dept => dept.name === pred.name));

  // Filter departments based on search
  const filteredDepartments = departmentsWithMembers.filter(dept => dept.name.toLowerCase().includes(searchQuery.toLowerCase()) || dept.description?.toLowerCase().includes(searchQuery.toLowerCase()));
  const onSubmit = async (data: DepartmentFormData) => {
    try {
      let departmentName = data.name;
      let departmentDescription = data.description;
      if (!data.isCustom && data.predefinedDepartment) {
        const predefined = predefinedDepartments.find(p => p.name === data.predefinedDepartment);
        if (predefined) {
          departmentName = predefined.name;
          departmentDescription = predefined.description;
        }
      }
      if (editingDepartment) {
        const success = await updateDepartment(editingDepartment.id, departmentName, departmentDescription);
        if (success) {
          toast({
            title: "Success",
            description: "Department updated successfully."
          });
          setIsDialogOpen(false);
          setEditingDepartment(null);
          form.reset();
          refetch();
        }
      } else {
        const result = await addDepartment(departmentName, departmentDescription, data.isCustom);
        if (result) {
          toast({
            title: "Success",
            description: "Department created successfully."
          });
          setIsDialogOpen(false);
          form.reset();
          refetch();
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
  const handleEdit = (department: any) => {
    setEditingDepartment(department);
    form.setValue('name', department.name);
    form.setValue('description', department.description || '');
    form.setValue('isCustom', true);
    setIsDialogOpen(true);
  };
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      const success = await deleteDepartment(id);
      if (success) {
        toast({
          title: "Success",
          description: "Department deleted successfully."
        });
        refetch();
      }
    }
  };
  const resetForm = () => {
    setEditingDepartment(null);
    form.reset();
    setShowPredefined(true);
  };
  const getDepartmentIcon = (name: string) => {
    const predefined = predefinedDepartments.find(p => p.name === name);
    return predefined?.icon || Users;
  };
  const getDepartmentColor = (name: string) => {
    const predefined = predefinedDepartments.find(p => p.name === name);
    return predefined?.color || 'bg-gray-500/10 text-gray-700 border-gray-200';
  };
  if (isLoading) {
    return <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded" />)}
        </div>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold">Department Management</h3>
          <p className="text-sm text-muted-foreground">
            Organize your team with predefined departments or create custom ones.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={open => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
          <DialogTrigger asChild>
            <Button className="btn-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-gray-50">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingDepartment ? 'Edit Department' : 'Add Department'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {!editingDepartment && <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Choose Department Type</h4>
                      <div className="flex gap-2">
                        <Button type="button" variant={showPredefined ? "default" : "outline"} size="sm" onClick={() => setShowPredefined(true)}>
                          Predefined
                        </Button>
                        <Button type="button" variant={!showPredefined ? "default" : "outline"} size="sm" onClick={() => {
                      setShowPredefined(false);
                      form.setValue('isCustom', true);
                    }}>
                          Custom
                        </Button>
                      </div>
                    </div>

                    {showPredefined && availablePredefined.length > 0 && <div className="space-y-3">
                        <FormField control={form.control} name="predefinedDepartment" render={({
                    field
                  }) => <FormItem>
                              <FormLabel>Select Department</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a predefined department" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availablePredefined.map(dept => {
                          const Icon = dept.icon;
                          return <SelectItem key={dept.name} value={dept.name}>
                                        <div className="flex items-center gap-2">
                                          <Icon className="h-4 w-4" />
                                          <div>
                                            <div className="font-medium">{dept.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {dept.description}
                                            </div>
                                          </div>
                                        </div>
                                      </SelectItem>;
                        })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>} />
                        
                        {watchedPredefined && <div className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {(() => {
                        const dept = predefinedDepartments.find(p => p.name === watchedPredefined);
                        const Icon = dept?.icon || Users;
                        return <Icon className="h-5 w-5" />;
                      })()}
                              <h5 className="font-medium">{watchedPredefined}</h5>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {predefinedDepartments.find(p => p.name === watchedPredefined)?.description}
                            </p>
                          </div>}

                        {availablePredefined.length > 0 && <div className="text-center">
                            <Separator />
                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                  Or create custom
                                </span>
                              </div>
                            </div>
                          </div>}
                      </div>}
                  </div>}

                {(isCustom || !showPredefined || editingDepartment) && <div className="space-y-4">
                    <FormField control={form.control} name="name" render={({
                  field
                }) => <FormItem>
                          <FormLabel>Department Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Fleet Maintenance" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="description" render={({
                  field
                }) => <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of the department..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-gradient-primary">
                    {editingDepartment ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search departments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {/* Department Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Departments</p>
                <p className="text-2xl font-bold">{departmentsWithMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">Active Departments</p>
                <p className="text-2xl font-bold">{departmentsWithMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-info" />
              <div>
                <p className="text-sm font-medium">Available Templates</p>
                <p className="text-2xl font-bold">{availablePredefined.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments Grid */}
      <div className="grid gap-4">
        {filteredDepartments.length === 0 ? <Card className="modern-card">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {searchQuery ? <p>No departments found matching "{searchQuery}".</p> : <p>No departments found. Create your first department to get started.</p>}
              </div>
            </CardContent>
          </Card> : filteredDepartments.map(department => {
        const Icon = getDepartmentIcon(department.name);
        const colorClass = getDepartmentColor(department.name);
        return <Card key={department.id} className="modern-card hover-lift">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-heading">{department.name}</CardTitle>
                        {department.description && <p className="text-sm text-muted-foreground mt-1">
                            {department.description}
                          </p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => {
                          setSelectedDepartment(department);
                          setAssignDialogOpen(true);
                        }}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {department.memberCount} members
                      </Badge>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(department)} className="hover:bg-primary/10">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(department.id)} className="hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {department.memberCount > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Department Members</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedDepartment(department);
                            setAssignDialogOpen(true);
                          }}
                        >
                          Manage <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {department.members.slice(0, 5).map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">
                                {[member.first_name, member.last_name].filter(Boolean).join(' ') || 'Unknown User'}
                              </span>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                {member.job_title && <span>{member.job_title}</span>}
                                {member.email && <span>• {member.email}</span>}
                              </div>
                            </div>
                            {member.roles && member.roles.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {member.roles.slice(0, 2).map((role: any) => (
                                  <Badge key={role.id} variant="secondary" className="text-xs">
                                    {role.name}
                                  </Badge>
                                ))}
                                {member.roles.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{member.roles.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {department.members.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center py-1">
                            And {department.members.length - 5} more members...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>;
      })}
      </div>

      {/* Assignment Dialog */}
      {selectedDepartment && (
        <AssignUserDialog
          departmentId={selectedDepartment.id}
          departmentName={selectedDepartment.name}
          isOpen={assignDialogOpen}
          onClose={() => {
            setAssignDialogOpen(false);
            setSelectedDepartment(null);
          }}
          onAssignmentChange={() => {
            refetch();
          }}
          currentMembers={selectedDepartment.members || []}
        />
      )}
    </div>;
}