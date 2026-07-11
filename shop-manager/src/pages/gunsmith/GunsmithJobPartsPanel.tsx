import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Trash2, CheckCircle, Loader2, ShoppingCart } from 'lucide-react';
import { useGunsmithParts } from '@/hooks/useGunsmith';
import { useJobParts, useAddJobPart, useDeductJobParts } from '@/hooks/useGunsmithInventory';
import { GunsmithJobPartOrderDialog } from '@/components/gunsmith/GunsmithJobPartOrderDialog';
import { GunsmithJobPartOrdersList } from '@/components/gunsmith/GunsmithJobPartOrdersList';

interface Props {
  jobId: string;
  jobStatus: string;
  customerId?: string;
}

export default function GunsmithJobPartsPanel({ jobId, jobStatus, customerId }: Props) {
  const { data: availableParts } = useGunsmithParts();
  const { data: jobParts, isLoading } = useJobParts(jobId);
  const addPart = useAddJobPart();
  const deductParts = useDeductJobParts();

  const [selectedPart, setSelectedPart] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const handleAddPart = () => {
    if (!selectedPart) return;
    const part = availableParts?.find(p => p.id === selectedPart);
    
    addPart.mutate({
      job_id: jobId,
      part_id: selectedPart,
      quantity: parseInt(quantity) || 1,
      unit_price: part?.retail_price || undefined
    }, {
      onSuccess: () => {
        setSelectedPart('');
        setQuantity('1');
      }
    });
  };

  const handleDeductAll = () => {
    deductParts.mutate(jobId);
  };

  const totalPartsValue = jobParts?.reduce((sum, jp) => sum + (jp.total_price || 0), 0) || 0;
  const hasUndeducted = jobParts?.some(jp => !jp.is_deducted);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Parts Used
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setOrderDialogOpen(true)}>
              <ShoppingCart className="h-4 w-4 mr-1" />
              Order Part
            </Button>
            {hasUndeducted && jobStatus === 'completed' && (
              <Button size="sm" onClick={handleDeductAll} disabled={deductParts.isPending}>
                {deductParts.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Deduct from Inventory
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Part Form */}
          <div className="flex gap-2">
            <Select value={selectedPart} onValueChange={setSelectedPart}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select part to add" />
              </SelectTrigger>
              <SelectContent>
                {availableParts?.map(part => (
                  <SelectItem key={part.id} value={part.id} disabled={part.quantity < 1}>
                    {part.name} - ${part.retail_price?.toFixed(2) || '0.00'} (Stock: {part.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-20"
            />
            <Button onClick={handleAddPart} disabled={!selectedPart || addPart.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Parts List */}
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : jobParts?.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No parts added to this job</p>
          ) : (
            <div className="space-y-2">
              {jobParts?.map(jp => (
                <div key={jp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-medium">{jp.gunsmith_parts?.name}</span>
                      {jp.gunsmith_parts?.part_number && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({jp.gunsmith_parts.part_number})
                        </span>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Qty: {jp.quantity} Ã— ${jp.unit_price?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${jp.total_price?.toFixed(2) || '0.00'}</span>
                    {jp.is_deducted ? (
                      <Badge variant="default" className="text-xs">Deducted</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Pending</Badge>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between pt-3 border-t">
                <span className="font-medium">Total Parts</span>
                <span className="font-bold">${totalPartsValue.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parts On Order Section */}
      <GunsmithJobPartOrdersList jobId={jobId} />

      {/* Order Part Dialog */}
      <GunsmithJobPartOrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        jobId={jobId}
        customerId={customerId}
      />
    </div>
  );
}
