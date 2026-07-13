import React from 'react';
import { PaymentMethod } from '@/types/payment';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash, 
  CheckCircle2,
  Wallet, 
  RefreshCw, 
  DollarSign
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddPaymentMethodDialog } from './AddPaymentMethodDialog';

interface PaymentMethodsListProps {
  customerId: string;
  paymentMethods: PaymentMethod[];
  onPaymentMethodAdded: () => void;
  onPaymentMethodUpdated: () => void;
  onPaymentMethodDeleted: () => void;
}

export function PaymentMethodsList({ 
  customerId,
  paymentMethods, 
  onPaymentMethodAdded,
  onPaymentMethodUpdated,
  onPaymentMethodDeleted
}: PaymentMethodsListProps) {
  const [open, setOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [methodToDelete, setMethodToDelete] = React.useState<string | null>(null);
  
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
  };
  
  const handleDeleteConfirmation = (methodId: string) => {
    setMethodToDelete(methodId);
    setDeleteOpen(true);
  };
  
  const handleDelete = async () => {
    // Simulate deleting the payment method
    console.log("Deleting payment method:", methodToDelete);
    setDeleteOpen(false);
    setMethodToDelete(null);
    onPaymentMethodDeleted();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your saved payment methods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-6">
              <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No payment methods added yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {paymentMethods.map((method) => (
                <Card key={method.id} className="bg-muted">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {method.method_type === 'credit_card' && method.card_brand 
                        ? `${method.card_brand} ••••${method.card_last_four}`
                        : method.method_type
                      }
                      {method.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {method.billing_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {method.billing_address}, {method.billing_city}, {method.billing_state} {method.billing_postal_code}, {method.billing_country}
                  </CardContent>
                  <CardFooter className="justify-end space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteConfirmation(method.id)}>
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </CardFooter>
      </Card>
      
      <AddPaymentMethodDialog 
        open={open} 
        onOpenChange={handleOpenChange} 
        customerId={customerId}
        onPaymentMethodAdded={onPaymentMethodAdded}
      />
      
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the payment method from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
