import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface CheckoutFormProps {
  orderData: {
    shipping_method: string;
    notes: string;
  };
  onUpdate: (data: any) => void;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ orderData, onUpdate }) => {
  const handleShippingMethodChange = (value: string) => {
    onUpdate({ ...orderData, shipping_method: value });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...orderData, notes: e.target.value });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Shipping Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shipping-method">Shipping Method</Label>
            <Select value={orderData.shipping_method} onValueChange={handleShippingMethodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select shipping method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Shipping (5-7 days) - Free</SelectItem>
                <SelectItem value="express">Express Shipping (2-3 days) - $15.00</SelectItem>
                <SelectItem value="overnight">Overnight Shipping - $25.00</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any special instructions or notes for your order..."
            value={orderData.notes}
            onChange={handleNotesChange}
            rows={3}
          />
        </CardContent>
      </Card>
    </>
  );
};