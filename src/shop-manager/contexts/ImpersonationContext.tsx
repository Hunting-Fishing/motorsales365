
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface ImpersonatedCustomer {
  id: string;
  name: string;
  email: string;
}

interface ImpersonationContextType {
  impersonatedCustomer: ImpersonatedCustomer | null;
  startImpersonation: (customer: ImpersonatedCustomer) => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedCustomer, setImpersonatedCustomer] = useState<ImpersonatedCustomer | null>(null);
  
  // Load impersonation state from localStorage on mount
  useEffect(() => {
    const savedImpersonation = localStorage.getItem('impersonatedCustomer');
    if (savedImpersonation) {
      try {
        setImpersonatedCustomer(JSON.parse(savedImpersonation));
      } catch (error) {
        console.error('Failed to parse impersonated customer data', error);
        localStorage.removeItem('impersonatedCustomer');
      }
    }
  }, []);

  const startImpersonation = (customer: ImpersonatedCustomer) => {
    setImpersonatedCustomer(customer);
    localStorage.setItem('impersonatedCustomer', JSON.stringify(customer));
  };

  const stopImpersonation = () => {
    setImpersonatedCustomer(null);
    localStorage.removeItem('impersonatedCustomer');
  };

  return (
    <ImpersonationContext.Provider 
      value={{ 
        impersonatedCustomer, 
        startImpersonation, 
        stopImpersonation,
        isImpersonating: impersonatedCustomer !== null
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export const useImpersonation = (): ImpersonationContextType => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};
