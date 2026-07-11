import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, User, Droplets, DollarSign, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const paymentStatusColors: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

interface SepticOrderOverviewTabProps {
  order: any;
}

export default function SepticOrderOverviewTab({ order }: SepticOrderOverviewTabProps) {
  const navigate = useNavigate();
  const customer = order.septic_customers as any;
  const tank = order.septic_tanks as any;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer ? (
              <>
                <p
                  className="font-medium cursor-pointer text-primary hover:underline"
                  onClick={() => navigate(`/septic/customers/${customer.id}`)}
                >
                  {customer.first_name} {customer.last_name}
                </p>
                {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
                {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                {customer.address && (
                  <p className="text-sm text-muted-foreground">
                    {customer.address}
                    {customer.city && `, ${customer.city}`}
                    {customer.state && `, ${customer.state}`}
                    {customer.zip_code && ` ${customer.zip_code}`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No customer assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Schedule & Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Schedule & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.scheduled_date ? (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(order.scheduled_date), 'MMM d, yyyy')}</span>
                {order.scheduled_time && <span>at {order.scheduled_time}</span>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not scheduled</p>
            )}
            {order.location_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{order.location_address}</span>
              </div>
            )}
            {order.completed_date && (
              <p className="text-sm text-muted-foreground">
                Completed: {format(new Date(order.completed_date), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="h-4 w-4 text-muted-foreground" /> Service Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tank && (
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Tank:</span> {tank.tank_type} — {tank.tank_size_gallons} gal</p>
                {tank.location_address && (
                  <p><span className="text-muted-foreground">Location:</span> {tank.location_address}</p>
                )}
              </div>
            )}
            {order.gallons_pumped != null && Number(order.gallons_pumped) > 0 && (
              <p className="text-sm"><span className="text-muted-foreground">Gallons Pumped:</span> {order.gallons_pumped}</p>
            )}
            {order.disposal_site && (
              <p className="text-sm"><span className="text-muted-foreground">Disposal Site:</span> {order.disposal_site}</p>
            )}
            {order.disposal_manifest && (
              <p className="text-sm"><span className="text-muted-foreground">Manifest:</span> {order.disposal_manifest}</p>
            )}
            {!tank && !order.gallons_pumped && !order.disposal_site && (
              <p className="text-sm text-muted-foreground">No service details recorded yet</p>
            )}
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" /> Financial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.payment_status && (
              <Badge variant="secondary" className={paymentStatusColors[order.payment_status] || ''}>
                {order.payment_status}
              </Badge>
            )}
            {order.subtotal != null && (
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span></div>
                {order.tax != null && Number(order.tax) > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${Number(order.tax).toFixed(2)}</span></div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold"><span>Total</span><span>${Number(order.total || 0).toFixed(2)}</span></div>
              </div>
            )}
            {order.subtotal == null && <p className="text-sm text-muted-foreground">No pricing set</p>}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {(order.notes || order.internal_notes) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Customer Notes</p>
                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
            {order.internal_notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Internal Notes</p>
                <p className="text-sm whitespace-pre-wrap">{order.internal_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
