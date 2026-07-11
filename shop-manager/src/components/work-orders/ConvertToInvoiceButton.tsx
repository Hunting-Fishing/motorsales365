
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Receipt, Loader2 } from 'lucide-react';
import { convertWorkOrderToInvoice } from '@/services/quote/quoteService';
import { toast } from '@/hooks/use-toast';

interface ConvertToInvoiceButtonProps {
  workOrderId: string;
  workOrderStatus: string;
  onSuccess?: (invoiceId: string) => void;
}

export function ConvertToInvoiceButton({ 
  workOrderId, 
  workOrderStatus,
  onSuccess 
}: ConvertToInvoiceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Enhanced status checking with debug logging
  const canConvert = workOrderStatus === 'completed';
  
  console.log('ConvertToInvoiceButton render:', {
    workOrderId,
    workOrderStatus,
    canConvert,
    statusType: typeof workOrderStatus
  });

  const handleConvert = async () => {
    console.log('Convert to invoice initiated:', {
      workOrderId,
      workOrderStatus,
      canConvert
    });

    if (!canConvert) {
      const message = `Cannot convert work order with status "${workOrderStatus}". Work order must be completed before converting to invoice.`;
      console.warn(message);
      
      toast({
        title: "Cannot Convert",
        description: message,
        variant: "destructive"
      });
      return;
    }

    setIsConverting(true);
    try {
      console.log('Attempting to convert work order to invoice...');
      const invoiceId = await convertWorkOrderToInvoice(workOrderId, notes);
      
      console.log('Conversion successful:', { invoiceId });
      
      toast({
        title: "Success",
        description: "Work order converted to invoice successfully"
      });
      
      setIsOpen(false);
      setNotes('');
      onSuccess?.(invoiceId);
    } catch (error: any) {
      console.error('Error converting to invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to convert work order to invoice",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={!canConvert}
          className="flex items-center gap-2"
          title={canConvert ? "Convert to Invoice" : `Cannot convert: Status is "${workOrderStatus}", must be "completed"`}
        >
          <Receipt className="h-4 w-4" />
          Convert to Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Convert to Invoice
          </DialogTitle>
          <DialogDescription>
            This will create a new invoice from this work order including all job lines and parts.
            Current status: <strong>{workOrderStatus}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">Conversion Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this conversion..."
              rows={3}
              className="resize-none"
            />
          </div>

          {!canConvert && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                Work order status is currently "<strong>{workOrderStatus}</strong>". 
                It must be set to "completed" before it can be converted to an invoice.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={isConverting || !canConvert}
          >
            {isConverting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                Create Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
