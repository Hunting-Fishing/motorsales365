import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, CreditCard, Trash2 } from 'lucide-react';
import { 
  getCustomerPaymentMethods, 
  deleteCustomerPaymentMethod 
} from '@/services/customerProfileService';
import { CustomerPaymentMethod } from '@/types/phase3';

interface PaymentMethodsTabProps {
  userId: string;
}

export const PaymentMethodsTab = ({ userId }: PaymentMethodsTabProps) => {
  const [paymentMethods, setPaymentMethods] = useState<CustomerPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPaymentMethods();
  }, [userId]);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      const data = await getCustomerPaymentMethods(userId);
      setPaymentMethods(data);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;

    setLoading(true);
    try {
      const success = await deleteCustomerPaymentMethod(id);
      if (success) {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
        toast({
          title: "Payment Method Removed",
          description: "Your payment method has been removed successfully.",
        });
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: "There was an error removing your payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'paypal': return 'bg-yellow-100 text-yellow-800';
      case 'bank': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Payment Methods</h3>
          <p className="text-sm text-muted-foreground">
            Manage your saved payment methods for faster checkout
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No payment methods saved</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add a payment method to speed up your checkout process
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Payment Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paymentMethods.map((method) => (
            <Card key={method.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-muted rounded-lg">
                      {getPaymentIcon(method.payment_type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium">
                          {method.provider} ****{method.last_four}
                        </p>
                        <Badge className={getPaymentTypeColor(method.payment_type)}>
                          {method.payment_type}
                        </Badge>
                        {method.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      {method.expiry_month && method.expiry_year && (
                        <p className="text-sm text-muted-foreground">
                          Expires {method.expiry_month.toString().padStart(2, '0')}/{method.expiry_year}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(method.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Security Information</CardTitle>
          <CardDescription>
            Your payment information is securely encrypted and stored by our payment processor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• We use industry-standard encryption to protect your payment data</p>
            <p>• We never store your full credit card numbers</p>
            <p>• All transactions are processed through secure, PCI-compliant systems</p>
            <p>• You can remove any payment method at any time</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};