
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Customer } from "@/types/customer";
import { searchCustomers } from "@/services/customer";

interface CustomerSearchInputProps {
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
  placeholderText?: string;
  disabledCustomerIds?: string[];
}

export const CustomerSearchInput: React.FC<CustomerSearchInputProps> = ({
  onSelectCustomer,
  selectedCustomer,
  placeholderText = "Search customers...",
  disabledCustomerIds = []
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search customers as the user types
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setLoading(true);
        const results = await searchCustomers(searchQuery);
        
        // Filter out disabled customers
        const filteredResults = disabledCustomerIds.length > 0
          ? results.filter(cust => !disabledCustomerIds.includes(cust.id))
          : results;
          
        setSearchResults(filteredResults);
        setShowResults(true);
      } catch (error) {
        console.error("Error searching customers:", error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, disabledCustomerIds]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchQuery("");
    setShowResults(false);
  };

  const handleClearSelection = () => {
    onSelectCustomer(null);
  };

  return (
    <div className="relative" ref={searchRef}>
      {selectedCustomer ? (
        <div className="flex items-center border p-2 rounded-md">
          <div className="bg-slate-100 p-1 rounded-full mr-2">
            <User className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">
              {selectedCustomer.first_name} {selectedCustomer.last_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedCustomer.email || "No email"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Input
              placeholder={placeholderText}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowResults(searchResults.length > 0)}
              className="w-full"
            />
            {loading && (
              <div className="absolute top-0 right-0 h-full flex items-center pr-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          {showResults && (
            <div className="absolute mt-1 w-full bg-white shadow-lg rounded-md border z-50 max-h-64 overflow-auto">
              {searchResults.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No customers found
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <p className="font-medium text-sm">
                        {customer.first_name} {customer.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.email || "No email"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
