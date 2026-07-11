
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileX } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-slate-100 p-4 mb-4">
        <FileX className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
      <p className="text-slate-500 max-w-sm mb-6">
        There are no invoices yet. Create your first invoice to get started.
      </p>
      <Button onClick={() => navigate('/invoices/create')}>
        Create an invoice
      </Button>
    </div>
  );
};
