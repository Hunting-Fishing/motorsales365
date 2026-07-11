
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Banknote, 
  FileCheck, 
  CreditCard, 
  Building, 
  Landmark, 
  Smartphone, 
  Wallet, 
  Send, 
  Receipt, 
  MoreHorizontal 
} from 'lucide-react';
import { PAYMENT_METHODS } from '@/constants/paymentMethods';

const iconMap: Record<string, React.ElementType> = {
  Banknote,
  FileCheck,
  CreditCard,
  Building,
  Landmark,
  Smartphone,
  Wallet,
  Send,
  Receipt,
  MoreHorizontal,
};

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PaymentMethodSelect({
  value,
  onChange,
  className,
  placeholder = 'Select payment method',
  disabled = false,
}: PaymentMethodSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_METHODS.map((method) => {
          const Icon = iconMap[method.icon] || MoreHorizontal;
          return (
            <SelectItem key={method.value} value={method.value}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{method.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
