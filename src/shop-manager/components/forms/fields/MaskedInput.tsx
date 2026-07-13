import React from 'react';
import { IMaskInput } from 'react-imask';
import { cn } from '@/lib/utils';

interface MaskedInputProps {
  mask: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

// Common mask patterns
export const MASK_PATTERNS = {
  phone: '(000) 000-0000',
  phoneWithCountry: '+0 (000) 000-0000',
  ssn: '000-00-0000',
  zip: '00000',
  zipPlus4: '00000-0000',
  creditCard: '0000 0000 0000 0000',
  date: '00/00/0000',
  time: '00:00',
  currency: '$num',
  percentage: 'num%',
};

export const MaskedInput: React.FC<MaskedInputProps> = ({
  mask,
  value,
  onChange,
  placeholder,
  className,
  disabled,
  id,
  name,
}) => {
  return (
    <IMaskInput
      mask={mask}
      value={value}
      unmask={true}
      onAccept={(value: string) => onChange(value)}
      placeholder={placeholder}
      disabled={disabled}
      id={id}
      name={name}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
};

// Phone input with US format
export const PhoneInput: React.FC<Omit<MaskedInputProps, 'mask'>> = (props) => (
  <MaskedInput {...props} mask={MASK_PATTERNS.phone} placeholder={props.placeholder || '(555) 123-4567'} />
);

// SSN input
export const SSNInput: React.FC<Omit<MaskedInputProps, 'mask'>> = (props) => (
  <MaskedInput {...props} mask={MASK_PATTERNS.ssn} placeholder={props.placeholder || '123-45-6789'} />
);

// ZIP code input
export const ZipCodeInput: React.FC<Omit<MaskedInputProps, 'mask'> & { extended?: boolean }> = ({ extended, ...props }) => (
  <MaskedInput 
    {...props} 
    mask={extended ? MASK_PATTERNS.zipPlus4 : MASK_PATTERNS.zip} 
    placeholder={props.placeholder || (extended ? '12345-6789' : '12345')} 
  />
);

// Credit card input
export const CreditCardInput: React.FC<Omit<MaskedInputProps, 'mask'>> = (props) => (
  <MaskedInput {...props} mask={MASK_PATTERNS.creditCard} placeholder={props.placeholder || '1234 5678 9012 3456'} />
);

// Date input
export const DateMaskedInput: React.FC<Omit<MaskedInputProps, 'mask'>> = (props) => (
  <MaskedInput {...props} mask={MASK_PATTERNS.date} placeholder={props.placeholder || 'MM/DD/YYYY'} />
);

// Time input
export const TimeMaskedInput: React.FC<Omit<MaskedInputProps, 'mask'>> = (props) => (
  <MaskedInput {...props} mask={MASK_PATTERNS.time} placeholder={props.placeholder || 'HH:MM'} />
);

export default MaskedInput;
