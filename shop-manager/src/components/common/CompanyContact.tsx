
import React from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { Phone, Mail, MapPin } from 'lucide-react';

interface CompanyContactProps {
  showPhone?: boolean;
  showEmail?: boolean;
  showAddress?: boolean;
  className?: string;
}

export const CompanyContact: React.FC<CompanyContactProps> = ({
  showPhone = true,
  showEmail = true,
  showAddress = true,
  className = ''
}) => {
  const { contactInfo } = useCompany();

  const formatAddress = () => {
    const parts = [
      contactInfo.address,
      contactInfo.city,
      contactInfo.state,
      contactInfo.zip
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const address = formatAddress();

  return (
    <div className={`space-y-2 ${className}`}>
      {showPhone && contactInfo.phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4" />
          <span>{contactInfo.phone}</span>
        </div>
      )}
      
      {showEmail && contactInfo.email && (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4" />
          <span>{contactInfo.email}</span>
        </div>
      )}
      
      {showAddress && address && (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          <span>{address}</span>
        </div>
      )}
    </div>
  );
};
