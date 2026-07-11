
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { QuoteDetailsView } from '@/components/quotes/QuoteDetailsView';

export default function QuoteDetails() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No quote ID provided
        </AlertDescription>
      </Alert>
    );
  }

  return <QuoteDetailsView quoteId={id} />;
}
