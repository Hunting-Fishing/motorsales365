
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
import { Wrench, Loader2 } from 'lucide-react';
import { convertQuoteToWorkOrder } from '@/services/quote/quoteService';
import { toast } from '@/hooks/use-toast';

interface ConvertToWorkOrderButtonProps {
  quoteId: string;
  quoteStatus: string;
  onSuccess?: (workOrderId: string) => void;
}

export function ConvertToWorkOrderButton({ 
  quoteId, 
  quoteStatus,
  onSuccess 
}: ConvertToWorkOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  const canConvert = quoteStatus === 'approved';

  const handleConvert = async () => {
    if (!canConvert) {
      toast({
        title: "Cannot Convert",
        description: "Quote must be approved before converting to work order",
        variant: "destructive"
      });
      return;
    }

    setIsConverting(true);
    try {
      const workOrderId = await convertQuoteToWorkOrder(quoteId, notes);
      
      toast({
        title: "Success",
        description: "Quote converted to work order successfully"
      });
      
      setIsOpen(false);
      setNotes('');
      onSuccess?.(workOrderId);
    } catch (error: any) {
      console.error('Error converting to work order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to convert quote to work order",
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
        >
          <Wrench className="h-4 w-4" />
          Convert to Work Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Convert to Work Order
          </DialogTitle>
          <DialogDescription>
            This will create a new work order from this quote including all items as job lines.
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
                Quote must be approved before it can be converted to a work order.
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
                <Wrench className="h-4 w-4 mr-2" />
                Create Work Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
