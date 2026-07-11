import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin, Building2, Home, Users, Calendar, DollarSign, ClipboardList, ShieldCheck, Droplets } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface CustomerOverviewTabProps {
  customer: any;
  tanks: any[];
  orders: any[];
  invoices: any[];
}

export default function CustomerOverviewTab({ customer, tanks, orders, invoices }: CustomerOverviewTabProps) {
  const totalSpent = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);
  const openOrders = orders.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled').length;
  const completedOrders = orders.filter((o: any) => o.status === 'completed');
  const lastServiceDate = completedOrders.length > 0
    ? completedOrders.sort((a: any, b: any) => new Date(b.scheduled_date || b.created_at).getTime() - new Date(a.scheduled_date || a.created_at).getTime())[0]?.scheduled_date
    : null;
  const daysSinceService = lastServiceDate ? differenceInDays(new Date(), new Date(lastServiceDate)) : null;

  const customerTypeIcon = customer.customer_type === 'commercial' || customer.customer_type === 'municipal'
    ? <Building2 className="h-4 w-4" />
    : <Home className="h-4 w-4" />;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Lifetime Spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ClipboardList className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{openOrders}</p>
            <p className="text-xs text-muted-foreground">Open Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{daysSinceService != null ? `${daysSinceService}d` : '—'}</p>
            <p className="text-xs text-muted-foreground">Since Last Service</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Droplets className="h-5 w-5 mx-auto mb-1 text-teal-500" />
            <p className="text-2xl font-bold">{tanks.length}</p>
            <p className="text-xs text-muted-foreground">Systems on File</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`tel:${customer.phone}`} className="text-sm text-primary hover:underline">{customer.phone}</a>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${customer.email}`} className="text-sm text-primary hover:underline">{customer.email}</a>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{customer.address}</span>
              </div>
            )}
            {(customer.city || customer.state || customer.zip_code) && (
              <div className="flex items-center gap-3">
                <div className="w-4" />
                <span className="text-sm text-muted-foreground">
                  {[customer.city, customer.state, customer.zip_code].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {customer.county && (
              <div className="flex items-center gap-3">
                <div className="w-4" />
                <span className="text-sm text-muted-foreground">County: {customer.county}</span>
              </div>
            )}
            {(customer.emergency_contact_name || customer.emergency_contact_phone) && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Emergency Contact</p>
                {customer.emergency_contact_name && <p className="text-sm">{customer.emergency_contact_name}</p>}
                {customer.emergency_contact_phone && (
                  <a href={`tel:${customer.emergency_contact_phone}`} className="text-sm text-primary hover:underline">{customer.emergency_contact_phone}</a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Property Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {customerTypeIcon}
              <div>
                <p className="text-sm font-medium capitalize">{customer.customer_type || 'Residential'}</p>
                {customer.business_name && <p className="text-xs text-muted-foreground">{customer.business_name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {customer.bedrooms && (
                <div>
                  <p className="text-xs text-muted-foreground">Bedrooms</p>
                  <p className="text-sm font-medium">{customer.bedrooms}</p>
                </div>
              )}
              {customer.occupants && (
                <div>
                  <p className="text-xs text-muted-foreground">Occupants</p>
                  <p className="text-sm font-medium">{customer.occupants}</p>
                </div>
              )}
              {customer.property_size && (
                <div>
                  <p className="text-xs text-muted-foreground">Property Size</p>
                  <p className="text-sm font-medium">{customer.property_size}</p>
                </div>
              )}
              {customer.year_built && (
                <div>
                  <p className="text-xs text-muted-foreground">Year Built</p>
                  <p className="text-sm font-medium">{customer.year_built}</p>
                </div>
              )}
              {customer.well_distance_ft && (
                <div>
                  <p className="text-xs text-muted-foreground">Well Distance</p>
                  <p className="text-sm font-medium">{customer.well_distance_ft} ft</p>
                </div>
              )}
              {customer.water_source && (
                <div>
                  <p className="text-xs text-muted-foreground">Water Source</p>
                  <p className="text-sm font-medium capitalize">{customer.water_source}</p>
                </div>
              )}
              {customer.parcel_number && (
                <div>
                  <p className="text-xs text-muted-foreground">Parcel #</p>
                  <p className="text-sm font-medium">{customer.parcel_number}</p>
                </div>
              )}
              {customer.system_type && (
                <div>
                  <p className="text-xs text-muted-foreground">System Type</p>
                  <p className="text-sm font-medium capitalize">{customer.system_type}</p>
                </div>
              )}
            </div>

            {customer.access_notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Access Notes</p>
                <p className="text-sm">{customer.access_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
