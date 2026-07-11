
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useInvoices } from '@/hooks/useInvoices';
import { InvoiceList } from '@/components/invoices/InvoiceList';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Invoices() {
  const { invoices, isLoading, error } = useInvoices();

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Invoices | All Business 365</title>
        </Helmet>
        
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-lg">Loading invoices...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>Invoices | All Business 365</title>
        </Helmet>
        
        <div className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Invoices</h3>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Invoices | All Business 365</title>
      </Helmet>
      
      <div className="space-y-6">
        <InvoiceList 
          invoices={invoices} 
          isLoading={isLoading} 
          error={error ? new Error(error) : null} 
        />
      </div>
    </>
  );
}
