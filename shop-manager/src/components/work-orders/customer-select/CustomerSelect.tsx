
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, User } from "lucide-react";
import { Customer } from "@/types/customer";

interface CustomerSelectProps {
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomerId?: string | null;
}

export function CustomerSelect({ onSelectCustomer, selectedCustomerId }: CustomerSelectProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .order("first_name", { ascending: true });

        if (error) throw error;
        setCustomers(data || []);
        setFilteredCustomers(data || []);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer => {
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        const email = customer.email?.toLowerCase() || '';
        const phone = customer.phone?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        
        return fullName.includes(search) || 
               email.includes(search) || 
               phone.includes(search);
      });
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Format customer display
  const getCustomerDisplay = (customer: Customer) => {
    const name = `${customer.first_name} ${customer.last_name}`.trim();
    const contact = customer.email || customer.phone;
    return contact ? `${name} (${contact})` : name;
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search customers by name, email, or phone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />
      
      <Select
        disabled={loading}
        value={selectedCustomerId || ""}
        onValueChange={(value) => {
          const customer = customers.find(c => c.id === value);
          onSelectCustomer(customer || null);
        }}
      >
        <SelectTrigger className="bg-white dark:bg-slate-800">
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>Loading customers...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a customer" />
          )}
        </SelectTrigger>
        <SelectContent>
          {filteredCustomers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id || ""}>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>{getCustomerDisplay(customer)}</span>
              </div>
            </SelectItem>
          ))}
          {filteredCustomers.length === 0 && !loading && (
            <SelectItem value="no-results" disabled>
              No customers found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
