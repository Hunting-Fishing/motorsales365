import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string;
  department?: string;
}

interface EmployeeScheduleSearchProps {
  onEmployeeSelect?: (employeeId: string | null) => void;
  selectedEmployeeId?: string | null;
}

export function EmployeeScheduleSearch({ 
  onEmployeeSelect, 
  selectedEmployeeId 
}: EmployeeScheduleSearchProps) {
  const { shopId } = useShopId();
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (shopId) {
      fetchEmployees();
    }
  }, [shopId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = employees.filter(emp => 
        emp.first_name.toLowerCase().includes(query) ||
        emp.last_name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.job_title?.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query)
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees([]);
    }
  }, [searchQuery, employees]);

  const fetchEmployees = async () => {
    if (!shopId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, job_title, department')
      .eq('shop_id', shopId)
      .order('first_name');

    if (!error && data) {
      setEmployees(data);
    }
  };

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSearchQuery('');
    setFilteredEmployees([]);
    onEmployeeSelect?.(employee.id);
  };

  const handleClearSelection = () => {
    setSelectedEmployee(null);
    setSearchQuery('');
    onEmployeeSelect?.(null);
  };

  return (
    <div className="space-y-2">
      {selectedEmployee ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-2">
            <span className="mr-2">
              {selectedEmployee.first_name} {selectedEmployee.last_name}
            </span>
            {selectedEmployee.job_title && (
              <span className="text-xs text-muted-foreground">
                • {selectedEmployee.job_title}
              </span>
            )}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search employees by name, role, or department..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {filteredEmployees.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  className="w-full px-4 py-2 text-left hover:bg-accent transition-colors"
                  onClick={() => handleSelectEmployee(employee)}
                >
                  <div className="font-medium">
                    {employee.first_name} {employee.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {employee.job_title && <span>{employee.job_title}</span>}
                    {employee.department && <span> • {employee.department}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
