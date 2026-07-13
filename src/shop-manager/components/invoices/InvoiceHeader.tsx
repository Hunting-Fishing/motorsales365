
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoiceHeaderProps {
  onSaveAsDraft: () => void;
  onCreateInvoice: () => void;
}

export function InvoiceHeader({ onSaveAsDraft, onCreateInvoice }: InvoiceHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create New Invoice</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          onClick={onSaveAsDraft}
        >
          Save as Draft
        </Button>
        <Button 
          variant="default" 
          className="bg-esm-blue-600 hover:bg-esm-blue-700"
          onClick={onCreateInvoice}
        >
          Create Invoice
        </Button>
      </div>
    </div>
  );
}
