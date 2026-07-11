import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  CreditCard, 
  Edit, 
  Phone, 
  Mail, 
  MapPin,
  Building2,
  DollarSign,
  Droplets,
  Calendar,
  ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { EditWaterDeliveryCustomerDialog } from './EditWaterDeliveryCustomerDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { WaterDeliveryCustomerStats } from '@/hooks/water-delivery/useWaterDeliveryCustomerDetails';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface WaterDeliveryCustomerHeaderProps {
  customer: any;
  stats: WaterDeliveryCustomerStats;
  onRefresh: () => void;
}

export function WaterDeliveryCustomerHeader({ customer, stats, onRefresh }: WaterDeliveryCustomerHeaderProps) {
  const navigate = useNavigate();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { formatVolume, getVolumeLabel } = useWaterUnits();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <>
      <div className="space-y-6 mb-6">
        {/* Customer Info & Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Customer Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-14 w-14 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                    <Building2 className="h-7 w-7 text-cyan-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold text-foreground">
                        {customer.company_name || `${customer.first_name} ${customer.last_name}`.trim()}
                      </h1>
                      <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {customer.is_commercial && (
                        <Badge variant="outline" className="border-cyan-500 text-cyan-600">
                          Commercial
                        </Badge>
                      )}
                    </div>
                    {customer.company_name && (
                      <p className="text-muted-foreground">{customer.first_name} {customer.last_name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${customer.email}`} className="hover:text-foreground">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${customer.phone}`} className="hover:text-foreground">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {(customer.billing_address || customer.billing_city) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {[customer.billing_address, customer.billing_city, customer.billing_state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="outline">{customer.payment_terms || 'COD'}</Badge>
                  {customer.credit_limit > 0 && (
                    <Badge variant="outline">Credit Limit: {formatCurrency(customer.credit_limit)}</Badge>
                  )}
                  {customer.tax_exempt && (
                    <Badge variant="outline" className="border-green-500 text-green-600">Tax Exempt</Badge>
                  )}
                  {customer.requires_po && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">Requires PO</Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => navigate('/water-delivery/orders/new', { state: { customerId: customer.id } })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/water-delivery/quotes', { state: { customerId: customer.id } })}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  New Quote
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowPaymentDialog(true)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ClipboardList className="h-4 w-4" />
                <span className="text-xs">Total Orders</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">Balance Due</span>
              </div>
              <p className={`text-2xl font-bold ${stats.balanceDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {formatCurrency(stats.balanceDue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Droplets className="h-4 w-4" />
                <span className="text-xs">Total {getVolumeLabel(false)}</span>
              </div>
              <p className="text-2xl font-bold">{formatVolume(stats.totalGallons, 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Last Delivery</span>
              </div>
              <p className="text-lg font-semibold">
                {stats.lastDelivery ? format(new Date(stats.lastDelivery), 'MMM d, yyyy') : '-'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Next Delivery</span>
              </div>
              <p className="text-lg font-semibold">
                {stats.nextDelivery ? format(new Date(stats.nextDelivery), 'MMM d, yyyy') : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditWaterDeliveryCustomerDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        customer={customer}
        onSuccess={onRefresh}
      />

      <RecordPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        customerId={customer.id}
        customerName={customer.company_name || `${customer.first_name} ${customer.last_name}`.trim()}
        onSuccess={onRefresh}
      />
    </>
  );
}
