
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { Quote } from '@/types/quote';
import { EnhancedCreateQuoteDialog } from './EnhancedCreateQuoteDialog';

interface QuotesHeaderProps {
  quotes: Quote[];
  onQuoteCreated?: () => void;
}

export function QuotesHeader({ quotes, onQuoteCreated }: QuotesHeaderProps) {
  const statusCounts = quotes.reduce((acc, quote) => {
    acc[quote.status] = (acc[quote.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleQuoteCreated = (quoteId: string) => {
    // Refresh the quotes list
    if (onQuoteCreated) {
      onQuoteCreated();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quotes</h1>
        <p className="text-muted-foreground">
          Create and manage quotes for your customers
        </p>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>Total: {quotes.length}</span>
          <span>Draft: {statusCounts.draft || 0}</span>
          <span>Sent: {statusCounts.sent || 0}</span>
          <span>Approved: {statusCounts.approved || 0}</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Export
        </Button>
        <EnhancedCreateQuoteDialog onSuccess={handleQuoteCreated}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Quote
          </Button>
        </EnhancedCreateQuoteDialog>
      </div>
    </div>
  );
}
