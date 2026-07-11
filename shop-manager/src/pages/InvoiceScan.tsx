import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { InvoiceScanner } from '@/components/inventory/InvoiceScanner';

export default function InvoiceScan() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Scan Invoice | All Business 365</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/inventory')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FileText className="h-8 w-8" />
                Scan Invoice
              </h1>
              <p className="text-muted-foreground mt-1">
                Upload invoice photos to automatically extract and add products to inventory
              </p>
            </div>
          </div>
        </div>

        <InvoiceScanner />
      </div>
    </>
  );
}
