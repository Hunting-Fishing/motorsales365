import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, CreditCard } from 'lucide-react';
import { useCart } from '@/hooks/shopping/useCart';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';

interface ShoppingCartProps {
  isOpen?: boolean;
  onClose?: () => void;
  showCheckout?: boolean;
}

const ShoppingCartComponent: React.FC<ShoppingCartProps> = ({ 
  showCheckout = true 
}) => {
  const navigate = useNavigate();
  const { 
    items, 
    itemCount, 
    totalPrice, 
    loading, 
    removeFromCart, 
    updateQuantity, 
    clearCart 
  } = useCart();

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading cart...</span>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Your cart is empty</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
            <Badge variant="secondary">{itemCount}</Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearCart}
            className="text-destructive hover:text-destructive"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-96 overflow-y-auto space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <img 
                src={item.imageUrl} 
                alt={item.name}
                className="w-16 h-16 object-cover rounded-md"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.name}</h4>
                <p className="text-xs text-muted-foreground">{item.manufacturer}</p>
                <p className="text-sm font-semibold">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(totalPrice)}</span>
          </div>
        </div>

        {showCheckout && (
          <div className="space-y-2">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate('/checkout')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Proceed to Checkout
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/shopping')}
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShoppingCartComponent;