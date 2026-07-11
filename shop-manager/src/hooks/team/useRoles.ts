
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role display name mapping
  const roleDisplayNames: Record<string, string> = {
    'owner': 'Owner',
    'admin': 'Administrator', 
    'manager': 'Manager',
    'parts_manager': 'Parts Manager',
    'service_advisor': 'Service Advisor',
    'technician': 'Technician',
    'reception': 'Reception',
    'other_staff': 'Other Staff',
    'yard_manager': 'Yard Manager',
    'mechanic_manager': 'Mechanic Manager',
    'yard_manager_assistant': 'Yard Manager Assistant',
    'mechanic_manager_assistant': 'Mechanic Manager Assistant'
  };

  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Fetching roles");
        const { data, error } = await supabase
          .from('roles')
          .select('*')
          .order('priority');
          
        if (error) {
          console.error("Error fetching roles:", error);
          throw error;
        }
        
        console.log("Fetched roles:", data);
        
        // Map the DB roles to display names
        const mappedRoles = data.map(role => ({
          id: role.id,
          name: role.name,
          displayName: roleDisplayNames[role.name] || role.name,
          description: role.description
        }));
        
        setRoles(mappedRoles);
      } catch (err) {
        console.error('Error fetching roles:', err);
        setError('Failed to load roles');
        toast({
          title: "Error",
          description: "Failed to load roles. Using default values instead.",
          variant: "destructive"
        });
        // Provide some default roles so the form still works
        setRoles([
          { id: '1', name: 'technician', displayName: 'Technician', description: 'Performs service work' },
          { id: '2', name: 'manager', displayName: 'Manager', description: 'Manages team members' },
          { id: '3', name: 'admin', displayName: 'Administrator', description: 'Administers the system' },
          { id: '4', name: 'owner', displayName: 'Owner', description: 'Business owner' },
          { id: '5', name: 'service_advisor', displayName: 'Service Advisor', description: 'Advises on services' },
          { id: '6', name: 'reception', displayName: 'Reception', description: 'Front desk staff' },
          { id: '7', name: 'other_staff', displayName: 'Other Staff', description: 'Other staff members' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoles();
  }, []);

  return { roles, isLoading, error };
}
