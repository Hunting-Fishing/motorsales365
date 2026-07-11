
import React, { useState, useEffect } from "react";
import { 
  getCustomerShops, 
  unregisterFromShop, 
  ShopDirectoryItem 
} from "@/services/shopDirectory/shopDirectoryService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, MapPin, Phone, Mail, MinusCircle } from "lucide-react";

interface CustomerShopsProps {
  customerId: string;
}

export function CustomerShops({ customerId }: CustomerShopsProps) {
  const [shops, setShops] = useState<ShopDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadCustomerShops = async () => {
      if (!customerId) return;
      
      try {
        setIsLoading(true);
        const customerShops = await getCustomerShops(customerId);
        setShops(customerShops);
      } catch (error) {
        console.error("Error loading customer shops:", error);
        toast({
          title: "Error",
          description: "Failed to load your registered shops.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCustomerShops();
  }, [customerId, toast]);

  const handleUnregister = async (shopId: string) => {
    try {
      const success = await unregisterFromShop(customerId, shopId);
      if (success) {
        setShops(shops.filter(shop => shop.id !== shopId));
        toast({
          title: "Unregistered",
          description: "You've been unregistered from this shop.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error unregistering from shop:", error);
      toast({
        title: "Error",
        description: "Failed to unregister from shop. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">My Registered Shops</h2>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">My Registered Shops</h2>
      
      {shops.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>You haven't registered with any shops yet.</p>
            <Button 
              variant="link" 
              onClick={() => document.getElementById('shop-directory-tab')?.click()}
            >
              Browse the shop directory to get started
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shops.map((shop) => (
            <Card key={shop.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{shop.name}</CardTitle>
                    <CardDescription>
                      {shop.city}, {shop.state}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleUnregister(shop.id)}
                  >
                    <MinusCircle className="h-4 w-4 mr-2" />
                    Unregister
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{shop.address}</span>
                  </div>
                  {shop.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{shop.phone}</span>
                    </div>
                  )}
                  {shop.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{shop.email}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button variant="outline" size="sm" className="mt-2">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
