
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Control } from "react-hook-form";
import { TeamMemberFormValues } from "./formValidation";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getDepartmentNames, getJobTitlesForDepartment, getSuggestedRole, roleMetadata } from "./jobTitleData";
import { Check, X } from "lucide-react";

interface JobInfoFieldsProps {
  control: Control<TeamMemberFormValues>;
  availableRoles: string[];
  availableDepartments: string[];
  isLoading?: boolean;
}

export function JobInfoFields({ 
  control, 
  availableRoles, 
  availableDepartments,
  isLoading = false 
}: JobInfoFieldsProps) {
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [suggestedRole, setSuggestedRole] = useState<string | null>(null);
  const currentDepartment = control._formValues.department;
  const currentJobTitle = control._formValues.jobTitle;
  
  // Update job titles when department changes
  useEffect(() => {
    if (currentDepartment) {
      const titles = getJobTitlesForDepartment(currentDepartment);
      setJobTitles(titles);
      // Clear job title and role when department changes
      if (control._formValues.jobTitle) {
        control._formValues.jobTitle = '';
        control._formValues.role = '';
      }
    } else {
      setJobTitles([]);
    }
  }, [currentDepartment]);
  
  // Auto-suggest role when job title changes
  useEffect(() => {
    if (currentDepartment && currentJobTitle) {
      const suggested = getSuggestedRole(currentDepartment, currentJobTitle);
      setSuggestedRole(suggested);
      if (suggested) {
        // Auto-fill the suggested role
        control._formValues.role = suggested;
      }
    }
  }, [currentJobTitle, currentDepartment]);
  
  if (isLoading) {
    return (
      <>
        <Skeleton className="h-10 w-full mb-6" />
        <Skeleton className="h-10 w-full mb-6" />
        <Skeleton className="h-10 w-full" />
      </>
    );
  }

  return (
    <>
      <FormField
        control={control}
        name="department"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Department / Category</FormLabel>
            <Select 
              onValueChange={field.onChange}
              value={field.value || ""} 
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {getDepartmentNames().map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Select the primary work area or department
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="jobTitle"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Title</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              value={field.value || ""}
              defaultValue={field.value}
              disabled={!currentDepartment}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={currentDepartment ? "Select a job title" : "Select department first"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {jobTitles.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Role (Permissions)</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              value={field.value || ""}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-96">
                {availableRoles.map((role) => {
                  const roleKey = role.toLowerCase().replace(/ /g, '_');
                  const metadata = roleMetadata[roleKey];
                  
                  return (
                    <SelectItem key={role} value={role} className="py-3">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">{role}</div>
                        {metadata && (
                          <>
                            <div className="text-xs text-muted-foreground">
                              {metadata.description}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {metadata.badges.map((badge) => (
                                <Badge 
                                  key={badge} 
                                  variant="outline" 
                                  className="text-xs px-1.5 py-0 h-5"
                                >
                                  <Check className="h-3 w-3 mr-0.5" />
                                  {badge}
                                </Badge>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormDescription>
              {suggestedRole 
                ? `Suggested: ${suggestedRole} - Determines system permissions` 
                : `This will determine the user's permissions in the system`}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
