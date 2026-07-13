
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Customer } from "@/types/customer";
import { CustomerFilterControls, CustomerFilters } from "@/components/customers/filters/CustomerFilterControls";
import { CustomerTable } from "./CustomerTable";
import { Loader2, Users, AlertCircle } from "lucide-react";

interface CustomersListProps {
  customers: Customer[];
  filteredCustomers: Customer[];
  filters: CustomerFilters;
  loading: boolean;
  error: string | null;
  onFilterChange: (filters: CustomerFilters) => void;
}

export const CustomersList = ({ 
  customers,
  filteredCustomers,
  filters,
  loading,
  error,
  onFilterChange 
}: CustomersListProps) => {
  console.log('CustomersList - customers:', customers);
  console.log('CustomersList - filteredCustomers:', filteredCustomers);
  console.log('CustomersList - loading:', loading);
  console.log('CustomersList - error:', error);
  
  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <div className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">Loading customers...</h3>
              <p className="text-sm text-slate-500">Please wait while we fetch your customer data</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-red-200 bg-red-50/80 backdrop-blur-sm">
        <div className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-900">Error loading customers</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Customer Directory</h2>
          </div>
          
          <CustomerFilterControls 
            filters={filters}
            onFilterChange={onFilterChange}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-200 hover:bg-slate-50/50">
                <TableHead className="w-[280px] font-semibold text-slate-700 py-4">Customer Information</TableHead>
                <TableHead className="font-semibold text-slate-700 py-4">Contact Details</TableHead>
                <TableHead className="font-semibold text-slate-700 py-4">Address</TableHead>
                <TableHead className="font-semibold text-slate-700 py-4">Tags & Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-700 py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <CustomerTable 
                customers={filteredCustomers}
                loading={false}
                error={null}
              />
            </TableBody>
          </Table>
        </div>
        
        {/* Enhanced Footer with Customer Count */}
        <div className="bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {filteredCustomers && filteredCustomers.length > 0 ? (
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Showing <span className="font-semibold text-slate-900">{filteredCustomers.length}</span> of{' '}
                  <span className="font-semibold text-slate-900">{customers?.length || 0}</span> customers
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  No customers match your current filters
                </span>
              )}
            </div>
            
            {filteredCustomers && filteredCustomers.length > 0 && (
              <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
