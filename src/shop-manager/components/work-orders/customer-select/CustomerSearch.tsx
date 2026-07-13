
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, User } from 'lucide-react';
import { Customer } from '@/types/customer';
import { searchCustomers } from '@/services/customer/customerSearchService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
  placeholder?: string;
}

export function CustomerSearch({ 
  onSelectCustomer, 
  selectedCustomer, 
  placeholder = "Search customers..."
}: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (searchTerm.length < 2) {
        setCustomers([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchCustomers(searchTerm, 10);
        setCustomers(results);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching customers:', error);
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchTerm(`${customer.first_name} ${customer.last_name}`);
    setShowResults(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    setCustomers([]);
    setShowResults(false);
    onSelectCustomer(null);
  };

  if (selectedCustomer) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer.email}
                </p>
                {selectedCustomer.phone && (
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.phone}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Change
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Searching customers...
            </div>
          ) : customers.length > 0 ? (
            <div className="py-1">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                      {customer.phone && (
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      )}
                    </div>
                    {customer.vehicles && customer.vehicles.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {customer.vehicles.length} vehicle{customer.vehicles.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-2">No customers found</p>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add New Customer
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
