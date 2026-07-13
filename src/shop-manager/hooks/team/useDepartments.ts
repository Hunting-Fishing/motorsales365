
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { departmentSubmissionService } from '@/services/team/departmentSubmissionService';

export interface Department {
  id: string;
  name: string;
  description?: string;
  shop_id?: string;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get user's shop_id from their profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('shop_id')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single();
          
        if (profileError) throw profileError;
        
        const userShopId = profile?.shop_id;
        if (!userShopId) throw new Error('No shop associated with user');
        
        setShopId(userShopId);
        
        // Fetch departments for this shop
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .eq('shop_id', userShopId)
          .order('name');
          
        if (error) throw error;
        
        // If no departments are found, create default ones
        if (!data || data.length === 0) {
          const defaultDepartments = [
            { name: 'Management', description: 'Company leadership and management', shop_id: userShopId },
            { name: 'Field Service', description: 'On-site technicians and service staff', shop_id: userShopId },
            { name: 'Administration', description: 'Office and administrative staff', shop_id: userShopId },
            { name: 'Customer Support', description: 'Customer service and support team', shop_id: userShopId },
            { name: 'Operations', description: 'Day-to-day operations staff', shop_id: userShopId }
          ];
          
          // Insert default departments
          const { data: insertedData, error: insertError } = await supabase
            .from('departments')
            .insert(defaultDepartments)
            .select();
            
          if (insertError) throw insertError;
          
          setDepartments(insertedData || []);
        } else {
          // Deduplicate by name (keep first occurrence)
          const uniqueDepartments = data.reduce((acc: Department[], current) => {
            const exists = acc.find(dept => dept.name === current.name);
            if (!exists) {
              acc.push(current);
            }
            return acc;
          }, []);
          
          setDepartments(uniqueDepartments);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments');
        toast({
          title: "Error",
          description: "Failed to load departments. Please try again.",
          variant: "destructive"
        });
        // Don't set fallback data that can cause UUID errors
        setDepartments([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, []);

  const addDepartment = async (name: string, description?: string, isCustom: boolean = false) => {
    if (!shopId) {
      toast({
        title: "Error",
        description: "Shop information not available.",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name, description, shop_id: shopId })
        .select()
        .single();
        
      if (error) throw error;
      
      // If this is a custom department (not from predefined list), track it for review
      if (isCustom) {
        try {
          await departmentSubmissionService.createSubmission({
            department_name: name,
            description,
            shop_id: shopId
          });
        } catch (submissionError) {
          console.warn('Failed to track custom department submission:', submissionError);
          // Don't block the department creation if submission tracking fails
        }
      }
      
      setDepartments(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding department:', err);
      toast({
        title: "Error",
        description: "Failed to add department.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateDepartment = async (id: string, name: string, description?: string) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .update({ name, description })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      setDepartments(prev => prev.map(dept => dept.id === id ? data : dept));
      return true;
    } catch (err) {
      console.error('Error updating department:', err);
      toast({
        title: "Error",
        description: "Failed to update department.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setDepartments(prev => prev.filter(dept => dept.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting department:', err);
      toast({
        title: "Error",
        description: "Failed to delete department. It may be in use by team members.",
        variant: "destructive"
      });
      return false;
    }
  };

  return { 
    departments, 
    isLoading, 
    error, 
    addDepartment, 
    updateDepartment, 
    deleteDepartment 
  };
}
