
import React from 'react';
import { Customer } from '@/types/customer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, MapPin, Mail, Phone, CreditCard, Building, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerProfileTabProps {
  customer: Customer;
}

export function CustomerProfileTab({ customer }: CustomerProfileTabProps) {
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'N/A';
    // Simple US phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Customer Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Full Name</Label>
              <p className="font-medium">{customer.first_name} {customer.last_name}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                  {customer.email || 'N/A'}
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Phone</Label>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {formatPhoneNumber(customer.phone)}
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Customer Since</Label>
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{formatDate(customer.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Address</Label>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-1" />
                <div>
                  <p>{customer.address || 'N/A'}</p>
                  {customer.city && customer.state && (
                    <p>{customer.city}, {customer.state} {customer.postal_code}</p>
                  )}
                  {customer.country && <p>{customer.country}</p>}
                </div>
              </div>
            </div>

            {customer.company && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Company</Label>
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{customer.company}</span>
                </div>
              </div>
            )}

            {customer.preferred_payment_method && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Preferred Payment Method</Label>
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{customer.preferred_payment_method}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Customer Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customer.referral_source && (
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Referral Source</Label>
              <p>{customer.referral_source}</p>
            </div>
          )}

          {customer.communication_preference && (
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Communication Preference</Label>
              <p>{customer.communication_preference}</p>
            </div>
          )}

          {customer.tags && customer.tags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline" className="flex items-center">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {customer.notes && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Notes</Label>
                <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Segments */}
      {customer.segments && customer.segments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {customer.segments.map((segment: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {segment}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
