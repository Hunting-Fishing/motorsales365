
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Percent, DollarSign, Tag } from 'lucide-react';
import { DiscountType, ApplyDiscountRequest } from '@/types/discount';
import { getDiscountTypesByCategory } from '@/services/discountService';
import { toast } from 'sonner';
import { useUserProfile } from '@/hooks/useUserProfile';

interface ApplyDiscountDialogProps {
  children: React.ReactNode;
  onApplyDiscount: (discountRequest: ApplyDiscountRequest) => Promise<void>;
  discountCategory: 'labor' | 'parts' | 'work_order';
  currentAmount: number;
  title: string;
}

export function ApplyDiscountDialog({
  children,
  onApplyDiscount,
  discountCategory,
  currentAmount,
  title
}: ApplyDiscountDialogProps) {
  const [open, setOpen] = useState(false);
  const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
  const [selectedDiscountType, setSelectedDiscountType] = useState<DiscountType | null>(null);
  const [customDiscount, setCustomDiscount] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed_amount',
    value: 0,
    reason: ''
  });
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useUserProfile();

  useEffect(() => {
    if (open) {
      loadDiscountTypes();
    }
  }, [open, discountCategory]);

  const loadDiscountTypes = async () => {
    try {
      const types = await getDiscountTypesByCategory(discountCategory);
      setDiscountTypes(types);
    } catch (error) {
      console.error('Error loading discount types:', error);
      toast.error('Failed to load discount types');
    }
  };

  const calculateDiscountAmount = (value: number, type: 'percentage' | 'fixed_amount') => {
    if (type === 'percentage') {
      return (currentAmount * value) / 100;
    }
    return value;
  };

  const handleApplyDiscount = async () => {
    setLoading(true);
    try {
      let discountRequest: ApplyDiscountRequest;

      if (useCustom) {
        if (!customDiscount.name.trim()) {
          toast.error('Please enter a discount name');
          return;
        }
        if (customDiscount.value <= 0) {
          toast.error('Please enter a valid discount value');
          return;
        }

        discountRequest = {
          discount_name: customDiscount.name,
          discount_type: customDiscount.type,
          discount_value: customDiscount.value,
          reason: customDiscount.reason,
          created_by: userProfile?.email || 'unknown'
        };
      } else {
        if (!selectedDiscountType) {
          toast.error('Please select a discount type');
          return;
        }

        discountRequest = {
          discount_type_id: selectedDiscountType.id,
          discount_name: selectedDiscountType.name,
          discount_type: selectedDiscountType.discount_type,
          discount_value: selectedDiscountType.default_value,
          reason: `Applied ${selectedDiscountType.name}`,
          created_by: userProfile?.email || 'unknown'
        };
      }

      await onApplyDiscount(discountRequest);
      setOpen(false);
      toast.success('Discount applied successfully');
      
      // Reset form
      setSelectedDiscountType(null);
      setCustomDiscount({ name: '', type: 'percentage', value: 0, reason: '' });
      setUseCustom(false);
    } catch (error) {
      console.error('Error applying discount:', error);
      toast.error('Failed to apply discount');
    } finally {
      setLoading(false);
    }
  };

  const previewAmount = useCustom 
    ? calculateDiscountAmount(customDiscount.value, customDiscount.type)
    : selectedDiscountType 
      ? calculateDiscountAmount(selectedDiscountType.default_value, selectedDiscountType.discount_type)
      : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Amount */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Amount:</span>
              <span className="font-medium">${currentAmount.toFixed(2)}</span>
            </div>
            {previewAmount > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Discount:</span>
                  <span className="font-medium text-red-600">-${previewAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2 mt-2">
                  <span className="text-sm font-medium">New Total:</span>
                  <span className="font-bold">${(currentAmount - previewAmount).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          {/* Discount Selection */}
          <RadioGroup
            value={useCustom ? 'custom' : 'predefined'}
            onValueChange={(value) => setUseCustom(value === 'custom')}
          >
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="predefined" id="predefined" />
                <Label htmlFor="predefined">Use Predefined Discount</Label>
              </div>

              {!useCustom && (
                <div className="ml-6 space-y-3">
                  <Select
                    value={selectedDiscountType?.id || ''}
                    onValueChange={(value) => {
                      const type = discountTypes.find(dt => dt.id === value);
                      setSelectedDiscountType(type || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      {discountTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{type.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {type.discount_type === 'percentage' 
                                ? `${type.default_value}%` 
                                : `$${type.default_value}`}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedDiscountType && (
                    <div className="text-sm text-muted-foreground">
                      {selectedDiscountType.description}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom Discount</Label>
              </div>

              {useCustom && (
                <div className="ml-6 space-y-4">
                  <div>
                    <Label htmlFor="discount-name">Discount Name</Label>
                    <Input
                      id="discount-name"
                      value={customDiscount.name}
                      onChange={(e) => setCustomDiscount(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Special Promotion"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Discount Type</Label>
                      <Select
                        value={customDiscount.type}
                        onValueChange={(value: 'percentage' | 'fixed_amount') => 
                          setCustomDiscount(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">
                            <div className="flex items-center gap-2">
                              <Percent className="h-4 w-4" />
                              Percentage
                            </div>
                          </SelectItem>
                          <SelectItem value="fixed_amount">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Fixed Amount
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="discount-value">
                        {customDiscount.type === 'percentage' ? 'Percentage' : 'Amount'}
                      </Label>
                      <Input
                        id="discount-value"
                        type="number"
                        value={customDiscount.value}
                        onChange={(e) => setCustomDiscount(prev => ({ 
                          ...prev, 
                          value: parseFloat(e.target.value) || 0 
                        }))}
                        placeholder={customDiscount.type === 'percentage' ? '10' : '50.00'}
                        min="0"
                        step={customDiscount.type === 'percentage' ? '1' : '0.01'}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="discount-reason">Reason (Optional)</Label>
                    <Textarea
                      id="discount-reason"
                      value={customDiscount.reason}
                      onChange={(e) => setCustomDiscount(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Optional reason for this discount"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </RadioGroup>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyDiscount}
              disabled={loading || (!useCustom && !selectedDiscountType) || (useCustom && (!customDiscount.name || customDiscount.value <= 0))}
            >
              {loading ? 'Applying...' : 'Apply Discount'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
