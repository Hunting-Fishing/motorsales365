
import React from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { Phone, Mail, MapPin, Clock, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CompanyContactEnhancedProps {
  variant?: 'default' | 'card' | 'inline' | 'footer';
  showPhone?: boolean;
  showEmail?: boolean;
  showAddress?: boolean;
  showBusinessHours?: boolean;
  showWebsite?: boolean;
  className?: string;
  title?: string;
}

export const CompanyContactEnhanced: React.FC<CompanyContactEnhancedProps> = ({
  variant = 'default',
  showPhone = true,
  showEmail = true,
  showAddress = true,
  showBusinessHours = false,
  showWebsite = false,
  className = '',
  title = 'Contact Information'
}) => {
  const { companyName, contactInfo } = useCompany();
  const { businessHours, businessDaysOfWeek } = useBusinessHours();

  const formatAddress = () => {
    const parts = [
      contactInfo.address,
      contactInfo.city,
      contactInfo.state,
      contactInfo.zip
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const formatBusinessHours = () => {
    if (!businessHours || businessHours.length === 0) {
      return "Contact for hours";
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const workingDays = businessDaysOfWeek;
    
    if (workingDays.length === 0) return "By appointment";
    
    // Show first working day as example
    const firstWorkingDay = workingDays[0];
    const dayHours = businessHours.find(h => h.day_of_week === firstWorkingDay);
    
    if (dayHours) {
      return `${dayNames[firstWorkingDay]}: ${dayHours.open_time} - ${dayHours.close_time}`;
    }
    
    return "Contact for hours";
  };

  const address = formatAddress();

  const contactItems = [
    showPhone && contactInfo.phone && {
      icon: Phone,
      label: 'Phone',
      value: contactInfo.phone,
      href: `tel:${contactInfo.phone}`
    },
    showEmail && contactInfo.email && {
      icon: Mail,
      label: 'Email',
      value: contactInfo.email,
      href: `mailto:${contactInfo.email}`
    },
    showAddress && address && {
      icon: MapPin,
      label: 'Address',
      value: address,
      href: `https://maps.google.com/?q=${encodeURIComponent(address)}`
    },
    showBusinessHours && {
      icon: Clock,
      label: 'Hours',
      value: formatBusinessHours(),
      href: null
    }
  ].filter(Boolean);

  if (contactItems.length === 0) {
    return null;
  }

  const ContactContent = () => (
    <div className={`space-y-3 ${variant === 'inline' ? 'space-y-2' : ''}`}>
      {contactItems.map((item, index) => {
        const Icon = item.icon;
        const content = (
          <div className={`flex items-center gap-2 ${variant === 'inline' ? 'text-sm' : ''}`}>
            <Icon className={`${variant === 'inline' ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
            <span className={variant === 'footer' ? 'text-muted-foreground' : ''}>{item.value}</span>
          </div>
        );

        return item.href ? (
          <a 
            key={index}
            href={item.href}
            target={item.href.startsWith('http') ? '_blank' : undefined}
            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="block hover:text-primary transition-colors"
          >
            {content}
          </a>
        ) : (
          <div key={index}>{content}</div>
        );
      })}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactContent />
        </CardContent>
      </Card>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`${className}`}>
        <h4 className="font-semibold mb-3 text-foreground">{title}</h4>
        <ContactContent />
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {variant === 'default' && title && (
        <h3 className="font-semibold mb-3">{title}</h3>
      )}
      <ContactContent />
    </div>
  );
};
