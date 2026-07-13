
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteCustomer } from '@/services/customer/customerDeleteService';

interface DeleteCustomerButtonProps {
  customerId: string;
  customerName?: string;
}

export const DeleteCustomerButton = ({ customerId, customerName }: DeleteCustomerButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const displayName = customerName || 'this customer';

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      const success = await deleteCustomer(customerId);
      
      if (success) {
        toast({
          title: 'Customer deleted',
          description: `${displayName} has been permanently removed from the system.`,
        });
        
        // Redirect to customers list
        navigate('/customers');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete customer. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the customer.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={() => setIsDialogOpen(true)}
        size="sm"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Customer
      </Button>
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {displayName} and all associated data, including:
              <ul className="list-disc ml-6 mt-2">
                <li>Vehicle information</li>
                <li>Service history</li>
                <li>Notes and communications</li>
                <li>Household relationships</li>
                <li>Loyalty data</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
