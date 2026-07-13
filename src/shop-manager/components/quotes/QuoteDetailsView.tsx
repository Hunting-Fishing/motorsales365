
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getQuoteById } from '@/services/quote/quoteService';
import { Quote, quoteStatusMap } from '@/types/quote';
import { formatCurrency } from '@/utils/formatters';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConvertToWorkOrderButton } from './ConvertToWorkOrderButton';
import { useQuoteTaxCalculations } from '@/hooks/useQuoteTaxCalculations';
import { getTaxSummaryText } from '@/utils/taxCalculations';
import { useNavigate } from 'react-router-dom';

interface QuoteDetailsViewProps {
  quoteId: string;
}

export function QuoteDetailsView({ quoteId }: QuoteDetailsViewProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('details');
  const navigate = useNavigate();

  // Get tax calculations using the centralized hook
  const taxCalculations = useQuoteTaxCalculations({
    quote,
    items: quote?.items,
    customer: null // We'd need to fetch customer data separately if needed
  });

  useEffect(() => {
    fetchQuote(quoteId);
  }, [quoteId]);

  const fetchQuote = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getQuoteById(id);
      if (data) {
        setQuote(data);
      } else {
        setError('Quote not found');
      }
    } catch (err: any) {
      console.error('Error fetching quote details:', err);
      setError(err.message || 'Failed to load quote details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading quote details...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Quote not found'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Quote {quote.quote_number || quote.id}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant="secondary" 
              className={quoteStatusMap[quote.status].classes}
            >
              {quoteStatusMap[quote.status].label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Created: {new Date(quote.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <ConvertToWorkOrderButton
            quoteId={quote.id}
            quoteStatus={quote.status}
            onSuccess={(workOrderId) => navigate(`/work-orders/${workOrderId}`)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Quote Details</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-6">
          {/* Customer and Vehicle Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{quote.customer_name || 'Unknown Customer'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{quote.customer_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{quote.customer_phone || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Make & Model</p>
                    <p className="font-medium">
                      {quote.vehicle_year} {quote.vehicle_make} {quote.vehicle_model}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{quoteStatusMap[quote.status].label}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expiry Date</p>
                  <p className="font-medium">
                    {quote.expiry_date ? 
                      new Date(quote.expiry_date).toLocaleDateString() : 
                      'N/A'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(taxCalculations.grandTotal || quote.total_amount)}</p>
                </div>
              </div>
              {quote.notes && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{quote.notes}</p>
                </div>
              )}
              {quote.terms_conditions && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Terms & Conditions</p>
                  <p className="font-medium">{quote.terms_conditions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Quote Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Item</th>
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-right p-2 font-medium">Quantity</th>
                      <th className="text-right p-2 font-medium">Unit Price</th>
                      <th className="text-right p-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items?.length ? (
                      quote.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{item.description || 'N/A'}</td>
                          <td className="p-2 capitalize">{item.item_type}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="p-2 text-right">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          No items in this quote
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={4}></td>
                      <td className="p-2 text-right font-medium">Subtotal</td>
                      <td className="p-2 text-right">{formatCurrency(quote.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4}></td>
                      <td className="p-2 text-right font-medium">
                        {taxCalculations.isLoading ? 'Tax (Loading...)' : getTaxSummaryText(taxCalculations)}
                      </td>
                      <td className="p-2 text-right">{formatCurrency(taxCalculations.totalTax)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td colSpan={4}></td>
                      <td className="p-2 text-right">Total</td>
                      <td className="p-2 text-right">{formatCurrency(taxCalculations.grandTotal || quote.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Quote History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="bg-primary/10 w-8 h-8 flex items-center justify-center rounded-full">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-medium">Quote Created</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(quote.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {quote.sent_at && (
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="bg-blue-50 w-8 h-8 flex items-center justify-center rounded-full">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium">Quote Sent</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(quote.sent_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {quote.approved_at && (
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="bg-green-50 w-8 h-8 flex items-center justify-center rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium">Quote Approved</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(quote.approved_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {quote.rejected_at && (
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="bg-red-50 w-8 h-8 flex items-center justify-center rounded-full">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium">Quote Rejected</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(quote.rejected_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {quote.converted_at && (
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-50 w-8 h-8 flex items-center justify-center rounded-full">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium">Converted to Work Order</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(quote.converted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
