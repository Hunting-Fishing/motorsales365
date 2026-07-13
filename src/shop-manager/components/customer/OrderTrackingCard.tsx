import React, { useEffect, useState } from 'react';
import { Package, Truck, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { orderTrackingService, OrderTracking } from '@/services/customer/orderTrackingService';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface OrderTrackingCardProps {
  orderId: string;
  orderNumber?: string;
  className?: string;
}

const statusConfig = {
  pending: { 
    label: 'Order Pending', 
    color: 'default', 
    icon: Package,
    description: 'Your order is being prepared'
  },
  processing: { 
    label: 'Processing', 
    color: 'secondary', 
    icon: Package,
    description: 'Your order is being processed'
  },
  shipped: { 
    label: 'Shipped', 
    color: 'default', 
    icon: Truck,
    description: 'Your order is on its way'
  },
  out_for_delivery: { 
    label: 'Out for Delivery', 
    color: 'default', 
    icon: Truck,
    description: 'Your order is out for delivery'
  },
  delivered: { 
    label: 'Delivered', 
    color: 'default', 
    icon: MapPin,
    description: 'Your order has been delivered'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'destructive', 
    icon: Package,
    description: 'Your order has been cancelled'
  }
} as const;

export function OrderTrackingCard({ orderId, orderNumber, className }: OrderTrackingCardProps) {
  const [tracking, setTracking] = useState<OrderTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTracking();
    
    // Subscribe to real-time updates
    const channel = orderTrackingService.subscribeToTrackingUpdates(orderId, (newTracking) => {
      setTracking(prev => [newTracking, ...prev.filter(t => t.id !== newTracking.id)]);
      
      toast({
        title: "Order Update",
        description: `Your order status has been updated to: ${newTracking.status}`,
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [orderId, toast]);

  const loadTracking = async () => {
    try {
      const trackingData = await orderTrackingService.getOrderTracking(orderId);
      setTracking(trackingData);
    } catch (error) {
      console.error('Error loading tracking:', error);
      toast({
        title: "Error",
        description: "Failed to load tracking information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = tracking[0];
  const config = currentStatus ? statusConfig[currentStatus.status as keyof typeof statusConfig] : statusConfig.pending;
  const StatusIcon = config?.icon || Package;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5" />
          Order Tracking
          {orderNumber && (
            <Badge variant="outline" className="ml-auto">
              #{orderNumber}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {currentStatus ? (
          <>
            {/* Current Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={config.color as any} className="text-sm">
                  {config.label}
                </Badge>
                {currentStatus.estimated_delivery && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Est. {new Date(currentStatus.estimated_delivery).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>

              {currentStatus.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{currentStatus.location}</span>
                </div>
              )}

              {currentStatus.tracking_number && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Tracking Number</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {currentStatus.tracking_number}
                    </p>
                  </div>
                  {currentStatus.carrier && (
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href={getCarrierTrackingUrl(currentStatus.carrier, currentStatus.tracking_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Track with {currentStatus.carrier}
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Tracking History */}
            {tracking.length > 1 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Tracking History</h4>
                  <div className="space-y-3">
                    {tracking.slice(1).map((update, index) => {
                      const updateConfig = statusConfig[update.status as keyof typeof statusConfig];
                      const UpdateIcon = updateConfig?.icon || Package;
                      
                      return (
                        <div key={update.id} className="flex items-start gap-3">
                          <div className="mt-1">
                            <UpdateIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {updateConfig?.label || update.status}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {update.location && (
                              <p className="text-xs text-muted-foreground">
                                Location: {update.location}
                              </p>
                            )}
                            {update.notes && (
                              <p className="text-xs text-muted-foreground">
                                {update.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No tracking information available yet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getCarrierTrackingUrl(carrier: string, trackingNumber: string): string {
  const carrierUrls: Record<string, (tracking: string) => string> = {
    'UPS': (tracking) => `https://www.ups.com/track?tracknum=${tracking}`,
    'FedEx': (tracking) => `https://www.fedex.com/fedextrack/?trknbr=${tracking}`,
    'USPS': (tracking) => `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${tracking}`,
    'DHL': (tracking) => `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${tracking}`,
  };

  const urlGenerator = carrierUrls[carrier.toUpperCase()];
  return urlGenerator ? urlGenerator(trackingNumber) : '#';
}