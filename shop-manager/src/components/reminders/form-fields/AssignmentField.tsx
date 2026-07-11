
import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ReminderFormValues } from "../schemas/reminderFormSchema";
import { supabase } from "@/integrations/supabase/client";

interface TeamMember {
  id: string;
  full_name?: string;
  first_name: string;
  last_name: string;
}

interface AssignmentFieldProps {
  form: UseFormReturn<ReminderFormValues>;
}

export function AssignmentField({ form }: AssignmentFieldProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load team members
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .order('first_name');
        
        if (error) throw error;
        
        // Transform the data to match TeamMember interface with proper type handling
        const formattedData: TeamMember[] = data?.map(member => ({
          id: member.id,
          first_name: member.first_name || '',
          last_name: member.last_name || '',
          // Create a full_name property by concatenating first_name and last_name
          full_name: `${member.first_name || ''} ${member.last_name || ''}`.trim()
        })) || [];
        
        setTeamMembers(formattedData);
      } catch (err) {
        console.error("Failed to load team members:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTeamMembers();
  }, []);
  
  return (
    <FormField
      control={form.control}
      name="assignedTo"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Assigned To</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value || "unassigned"}
          >
            <FormControl>
              <SelectTrigger
                className="w-full"
                disabled={isLoading}
              >
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name || `${member.first_name} ${member.last_name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
