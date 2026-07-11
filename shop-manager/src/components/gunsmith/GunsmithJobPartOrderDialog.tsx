import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCreateJobPartOrder } from '@/hooks/useGunsmithJobPartOrders';
import { 
  Loader2, 
  Package, 
  Truck, 
  DollarSign, 
  Calendar,
  FileText,
  Hash
} from 'lucide-react';

interface GunsmithJobPartOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  customerId?: string;
  jobNumber?: string;
}

export function GunsmithJobPartOrderDialog({
  open,
  onOpenChange,
  jobId,
  customerId,
  jobNumber,
}: GunsmithJobPartOrderDialogProps) {
  const [formData, setFormData] = useState({
    part_number: '',
    part_name: '',
    supplier: '',
    supplier_contact: '',
    quantity_ordered: 1,
    unit_cost: '',
    expected_date: '',
    notes: '',
  });

  const createOrder = useCreateJobPartOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createOrder.mutateAsync({
      job_id: jobId,
      customer_id: customerId,
      part_number: formData.part_number,
      part_name: formData.part_name,
      supplier: formData.supplier || undefined,
      supplier_contact: formData.supplier_contact || undefined,
      quantity_ordered: formData.quantity_ordered,
      unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : undefined,
      expected_date: formData.expected_date || undefined,
      notes: formData.notes || undefined,
    });

    // Reset form and close
    setFormData({
      part_number: '',
      part_name: '',
      supplier: '',
      supplier_contact: '',
      quantity_ordered: 1,
      unit_cost: '',
      expected_date: '',
      notes: '',
    });
    onOpenChange(false);
  };

  const totalCost = formData.unit_cost 
    ? (parseFloat(formData.unit_cost) * formData.quantity_ordered).toFixed(2)
    : '0.00';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Order Part for Job</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                {jobNumber && (
                  <Badge variant="outline" className="font-mono">
                    {jobNumber}
                  </Badge>
                )}
                Track parts ordered from suppliers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Part Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Hash className="h-4 w-4" />
              Part Details
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="part_number" className="text-xs">Part Number *</Label>
                <Input
                  id="part_number"
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  placeholder="GLK-19-TB"
                  className="font-mono text-sm"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="part_name" className="text-xs">Part Name *</Label>
                <Input
                  id="part_name"
                  value={formData.part_name}
                  onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                  placeholder="Glock 19 Gen 5 Trigger Bar"
                  className="text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-xs">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity_ordered}
                onChange={(e) => setFormData({ ...formData, quantity_ordered: parseInt(e.target.value) || 1 })}
                className="w-24 text-sm"
                required
              />
            </div>
          </div>

          <Separator />

          {/* Supplier Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Truck className="h-4 w-4" />
              Supplier Information
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-xs">Supplier Name</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Brownells"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_contact" className="text-xs">Order # / Contact</Label>
                <Input
                  id="supplier_contact"
                  value={formData.supplier_contact}
                  onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                  placeholder="ORD-12345"
                  className="text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Pricing
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unit_cost" className="text-xs">Unit Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    placeholder="0.00"
                    className="pl-7 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Qty</Label>
                <div className="h-9 flex items-center px-3 bg-muted/50 rounded-md text-sm font-medium">
                  × {formData.quantity_ordered}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Total</Label>
                <div className="h-9 flex items-center px-3 bg-primary/10 rounded-md text-sm font-bold text-primary">
                  ${totalCost}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timing & Notes Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Timing & Notes
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="expected_date" className="text-xs">Expected Arrival</Label>
                <Input
                  id="expected_date"
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                  className="w-48 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions, shipping details, etc..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createOrder.isPending || !formData.part_number || !formData.part_name}
              className="px-6 bg-amber-600 hover:bg-amber-700"
            >
              {createOrder.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Create Order
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
