
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Quote, quoteStatusMap } from '@/types/quote';
import { formatCurrency } from '@/utils/formatters';
import { Eye, Edit, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QuotesTableProps {
  quotes: Quote[];
}

export function QuotesTable({ quotes }: QuotesTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-4 font-medium">Quote #</th>
                <th className="text-left p-4 font-medium">Customer</th>
                <th className="text-left p-4 font-medium">Vehicle</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Total</th>
                <th className="text-left p-4 font-medium">Created</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div className="font-medium">{quote.quote_number}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{quote.customer_name}</div>
                    <div className="text-sm text-muted-foreground">{quote.customer_email}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {quote.vehicle_year} {quote.vehicle_make} {quote.vehicle_model}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge 
                      variant="secondary" 
                      className={quoteStatusMap[quote.status].classes}
                    >
                      {quoteStatusMap[quote.status].label}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{formatCurrency(quote.total_amount)}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Send Quote</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem>Download PDF</DropdownMenuItem>
                          {quote.status === 'approved' && (
                            <DropdownMenuItem>Convert to Work Order</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
