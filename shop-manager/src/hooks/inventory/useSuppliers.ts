
import { useState, useEffect } from 'react';
import { getInventorySuppliers, InventorySupplier } from '@/services/inventory/supplierService';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supplierData = await getInventorySuppliers();
      setSuppliers(supplierData);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const refreshSuppliers = () => {
    fetchSuppliers();
  };

  return { suppliers, loading, error, refreshSuppliers };
}
