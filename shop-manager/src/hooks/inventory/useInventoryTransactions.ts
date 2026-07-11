
import { useState, useEffect } from 'react';
import { 
  getInventoryTransactions, 
  getItemTransactions, 
  recordInventoryTransaction 
} from '@/services/inventory/transactionService';

export function useInventoryTransactions(itemId?: string) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let data;
        if (itemId) {
          data = await getItemTransactions(itemId);
        } else {
          data = await getInventoryTransactions();
        }
        
        setTransactions(data);
      } catch (err: any) {
        setError(err instanceof Error ? err : new Error(String(err)));
        console.error('Error fetching inventory transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [itemId]);
  
  const createTransaction = async (
    inventoryItemId: string, 
    quantity: number, 
    transactionType: 'in' | 'out' | 'adjustment', 
    notes?: string
  ) => {
    setError(null);
    try {
      await recordInventoryTransaction({
        inventory_item_id: inventoryItemId,
        quantity,
        transaction_type: transactionType,
        notes
      });
      
      // Refresh transactions
      const updatedTransactions = itemId 
        ? await getItemTransactions(itemId)
        : await getInventoryTransactions();
        
      setTransactions(updatedTransactions);
      
      return true;
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error('Error creating inventory transaction:', err);
      return false;
    }
  };
  
  return {
    transactions,
    loading,
    error,
    createTransaction
  };
}
