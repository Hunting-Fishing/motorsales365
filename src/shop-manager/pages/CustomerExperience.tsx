import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderTrackingCard } from '@/components/customer/OrderTrackingCard';
import { NotificationCenter } from '@/components/customer/NotificationCenter';
import { SupportTicketSystem } from '@/components/customer/SupportTicketSystem';
import { Bell, Package, MessageCircle, Heart } from 'lucide-react';

export default function CustomerExperience() {
  // For demo purposes, using placeholder user ID
  const userId = "demo-user-id";

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Customer Experience Center</h1>
        <p className="text-muted-foreground">
          Enhanced customer support, notifications, and order tracking
        </p>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              Order Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Real-time order tracking with delivery updates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" />
              Smart Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Personalized notifications and preference management
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4" />
              Support System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Integrated ticket system with real-time chat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4" />
              Enhanced Wishlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sharing, price alerts, and analytics
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <OrderTrackingCard 
          orderId="demo-order" 
          orderNumber="ORD-2024-001"
          className="h-fit"
        />
        
        <NotificationCenter 
          userId={userId}
          className="h-fit"
        />
      </div>

      {/* Support System */}
      <SupportTicketSystem userId={userId} />
    </div>
  );
}