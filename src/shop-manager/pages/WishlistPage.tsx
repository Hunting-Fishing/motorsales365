import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, ShoppingCart, Trash2, Share2, ArrowLeft } from 'lucide-react';
import { useWishlist } from '@/hooks/shopping/useWishlist';
import { useCart } from '@/hooks/shopping/useCart';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import ReviewStars from '@/components/shopping/reviews/ReviewStars';
import LoadingSkeleton from '@/components/shopping/LoadingSkeleton';

const WishlistPage: React.FC = () => {
  const { items, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = async (item: any) => {
    try {
      await addToCart({
        productId: item.productId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        category: item.category,
        manufacturer: item.manufacturer
      });
      
      toast({
        title: "Added to cart",
        description: `${item.name} has been added to your cart.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFromWishlist = async (productId: string, name: string) => {
    try {
      await removeFromWishlist(productId);
      toast({
        title: "Removed from wishlist",
        description: `${name} has been removed from your wishlist.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist.",
        variant: "destructive"
      });
    }
  };

  const handleShareWishlist = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Wishlist',
          text: `Check out my wishlist of ${items.length} automotive tools!`,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Wishlist link copied to clipboard."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share wishlist.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-32" />
          </div>
          <LoadingSkeleton variant="grid" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/shopping">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Shopping
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Heart className="h-8 w-8 text-red-500" />
                My Wishlist
              </h1>
              <p className="text-muted-foreground">
                {items.length} {items.length === 1 ? 'item' : 'items'} saved for later
              </p>
            </div>
          </div>
          
          {items.length > 0 && (
            <Button variant="outline" onClick={handleShareWishlist}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Wishlist
            </Button>
          )}
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Your wishlist is empty</h3>
              <p className="text-muted-foreground mb-6">
                Save items you're interested in to buy them later.
              </p>
              <Link to="/shopping">
                <Button>
                  Start Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Wishlist Items */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 hover:bg-background"
                    onClick={() => handleRemoveFromWishlist(item.productId, item.name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Category */}
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    {item.category}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold line-clamp-2 leading-tight">
                    {item.name}
                  </h3>

                  {/* Manufacturer */}
                  <div className="text-sm text-muted-foreground">
                    by {item.manufacturer}
                  </div>

                  {/* Rating - Mock data since not in wishlist */}
                  <ReviewStars rating={4.5} showNumber />

                  {/* Price */}
                  <div className="text-lg font-bold text-primary">
                    ${item.price.toFixed(2)}
                  </div>

                  {/* Added Date */}
                  <div className="text-xs text-muted-foreground">
                    Added {new Date(item.created_at).toLocaleDateString()}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleAddToCart(item)}
                      className="w-full"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleRemoveFromWishlist(item.productId, item.name)}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleShareWishlist}
                        size="sm"
                        className="px-3"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Wishlist Summary */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Wishlist Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{items.length}</div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    ${items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    ${(items.reduce((sum, item) => sum + item.price, 0) / items.length).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Price</div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-center">
                <Button size="lg" className="px-8">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add All to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;