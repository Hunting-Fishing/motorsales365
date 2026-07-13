
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CustomerDataContextType {
  customerData: any | null;
  setCustomerData: (data: any | null) => void;
}

const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined);

export function CustomerDataProvider({ children }: { children: ReactNode }) {
  const [customerData, setCustomerData] = useState<any | null>(null);

  return (
    <CustomerDataContext.Provider value={{ customerData, setCustomerData }}>
      {children}
    </CustomerDataContext.Provider>
  );
}

export function useCustomerData() {
  const context = useContext(CustomerDataContext);
  if (context === undefined) {
    throw new Error('useCustomerData must be used within a CustomerDataProvider');
  }
  return context;
}
