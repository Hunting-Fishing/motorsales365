
import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ServiceSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const ServiceSearch: React.FC<ServiceSearchProps> = ({
  value,
  onChange,
  placeholder = "Search services..."
}) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};
