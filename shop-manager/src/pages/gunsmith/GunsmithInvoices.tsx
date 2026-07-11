import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Receipt, 
  Plus, 
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

export default function GunsmithInvoices() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['gunsmith-invoices'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_invoices')
        .select('*, customers(first_name, last_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const filteredInvoices = invoices?.filter((i: any) => 
    i.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.customers?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'sent': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-amber-500';
    }
  };

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Invoices"
        subtitle="Manage billing and invoices"
        icon={<Receipt className="h-6 w-6 md:h-8 md:w-8 text-green-500 shrink-0" />}
        onBack={() => navigate('/gunsmith')}
        actions={
          <Button onClick={() => navigate('/gunsmith/invoices/new')} size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">New </span>Invoice
          </Button>
        }
      />

      <div className="mb-4 md:mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredInvoices?.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredInvoices?.map((invoice: any) => (
                <div 
                  key={invoice.id} 
                  className="p-3 md:p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted" 
                  onClick={() => navigate(`/gunsmith/invoices/${invoice.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm md:text-base">{invoice.invoice_number}</span>
                        <Badge className={`${getStatusColor(invoice.status)} text-white text-xs`}>{invoice.status}</Badge>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {invoice.customers?.first_name} {invoice.customers?.last_name}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-medium text-sm md:text-base">${invoice.total?.toFixed(2)}</p>
                      {invoice.balance_due > 0 && (
                        <p className="text-xs md:text-sm text-red-500">Due: ${invoice.balance_due?.toFixed(2)}</p>
                      )}
                      <p className="text-xs md:text-sm text-muted-foreground">{format(new Date(invoice.issue_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MobilePageContainer>
  );
}