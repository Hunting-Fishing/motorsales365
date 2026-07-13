
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { TeamMemberFormValues, teamMemberFormSchema } from './form/formValidation';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useDepartments } from '@/hooks/team/useDepartments';
import { useRoles } from '@/hooks/team/useRoles';
import { JobInfoFields } from './form/JobInfoFields';
import { PersonalInfoFields } from './form/PersonalInfoFields';
import { StatusToggleField } from './form/StatusToggleField';
import { NotesField } from './form/NotesField';
import { FormActions } from './form/FormActions';
import { detectRoleFromJobTitle } from '@/utils/roleUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamMemberFormProps {
  onSubmit: (data: TeamMemberFormValues) => void;
  isSubmitting?: boolean;
  initialData?: Partial<TeamMemberFormValues>;
  mode?: 'create' | 'edit';
}

export function TeamMemberForm({ onSubmit, isSubmitting = false, initialData, mode = 'create' }: TeamMemberFormProps) {
  const [autoDetectedRole, setAutoDetectedRole] = useState<string | null>(null);
  const [showRoleAlert, setShowRoleAlert] = useState(false);
  
  // Get departments and roles from our custom hooks
  const { departments, isLoading: loadingDepartments } = useDepartments();
  const { roles, isLoading: loadingRoles } = useRoles();

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberFormSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      middleName: initialData?.middleName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      jobTitle: initialData?.jobTitle || '',
      role: initialData?.role || '',
      department: initialData?.department || '',
      status: initialData?.status ?? true,
      notes: initialData?.notes || '',
    },
  });

  const jobTitle = form.watch('jobTitle');
  const role = form.watch('role');
  const firstName = form.watch('firstName');
  const lastName = form.watch('lastName');
  
  // Auto-generate email from first and last name for testing
  useEffect(() => {
    if (mode === 'create' && firstName && lastName) {
      const generatedEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@wainwrightmarine.com`;
      // Only update if email is empty or still matches the old pattern
      const currentEmail = form.getValues('email');
      if (!currentEmail || currentEmail.endsWith('@wainwrightmarine.com')) {
        form.setValue('email', generatedEmail);
      }
    }
  }, [firstName, lastName, mode, form]);
  
  // Auto-detect role from job title
  if (jobTitle && !role && mode === 'create') {
    const detectedRole = detectRoleFromJobTitle(jobTitle);
    if (detectedRole && detectedRole !== autoDetectedRole) {
      setAutoDetectedRole(detectedRole);
      setShowRoleAlert(true);
    }
  }

  const handleApplyDetectedRole = () => {
    if (autoDetectedRole) {
      form.setValue('role', autoDetectedRole);
      setShowRoleAlert(false);
    }
  };

  const handleSubmit = (data: TeamMemberFormValues) => {
    onSubmit(data);
  };

  const isLoading = loadingDepartments || loadingRoles;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {showRoleAlert && autoDetectedRole && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex justify-between items-center">
              <span>
                Based on the job title, we recommend the role: <strong>{autoDetectedRole}</strong>
              </span>
              <button 
                type="button" 
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-3 rounded text-sm"
                onClick={handleApplyDetectedRole}
              >
                Apply Role
              </button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <PersonalInfoFields control={form.control} />
          </div>
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Work Information</h3>
            <JobInfoFields 
              control={form.control}
              availableRoles={roles?.map(r => r.displayName) || []}
              availableDepartments={departments?.map(d => d.name) || []}
              isLoading={isLoading}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Additional Information</h3>
          <StatusToggleField control={form.control} />
          <NotesField control={form.control} />
        </div>
        
        <FormActions isSubmitting={isSubmitting} mode={mode} />
      </form>
    </Form>
  );
}
