import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Phone, 
  Star, 
  Search, 
  Calendar,
  Navigation,
  ExternalLink
} from 'lucide-react';
import { getPublicShops, type ShopDirectoryItem } from '@/services/shopDirectory/shopDirectoryService';

// Using live data from ShopDirectoryService

export function ShopDirectory() {
  const [shops, setShops] = useState<ShopDirectoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const shopsData = await getPublicShops({ searchTerm, limit: 20 });
      setShops(shopsData);
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadShops();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // Filtering is now handled by the service

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'text-amber-400 fill-current'
            : 'text-muted-foreground/30'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Shop Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shops or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading shops...</div>
          ) : shops.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shops found matching your search.
            </div>
          ) : (
            <div className="grid gap-6">
              {shops.map(shop => (
              <Card key={shop.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{shop.name}</h3>
                      <p className="text-muted-foreground">{shop.shop_description || 'Professional automotive service'}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        {renderStars(4.5)}
                        <span className="ml-1 font-medium">4.5</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        0 reviews
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      {shop.address}{shop.city && `, ${shop.city}`}
                      {shop.distance && (
                        <Badge variant="outline">{shop.distance.toFixed(1)} mi</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      {shop.phone || 'Call for info'}
                      <Badge variant="default">
                        Open
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <h4 className="font-medium mb-2">Services</h4>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">Full Service</Badge>
                        <Badge variant="outline">Oil Change</Badge>
                        <Badge variant="outline">Brake Service</Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Location</h4>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">
                          {shop.city || 'Automotive Service'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Book Appointment
                    </Button>
                    
                    <Button variant="outline" className="flex items-center gap-2">
                      <Navigation className="h-4 w-4" />
                      Get Directions
                    </Button>
                    
                    <Button variant="outline" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Visit Website
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}