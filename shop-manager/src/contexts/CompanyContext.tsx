
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useShopName } from '@/hooks/useShopName';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';

interface CompanyContextType {
  companyName: string;
  logoUrl: string;
  contactInfo: {
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  businessHours: any[];
  businessType: string;
  industry: string;
  loading: boolean;
  refresh: () => void;
  reloadCompanyInfo: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { shopName, loading: nameLoading, refresh: refreshName } = useShopName();
  const { companyInfo, businessHours, loading: infoLoading, loadCompanyInfo } = useCompanyInfo();

  const contextValue: CompanyContextType = {
    companyName: shopName || companyInfo?.name || 'All Business 365',
    logoUrl: companyInfo?.logo_url || '',
    contactInfo: {
      phone: companyInfo?.phone || '',
      email: companyInfo?.email || '',
      address: companyInfo?.address || '',
      city: companyInfo?.city || '',
      state: companyInfo?.state || '',
      zip: companyInfo?.zip || '',
    },
    businessHours: businessHours || [],
    businessType: companyInfo?.business_type || '',
    industry: companyInfo?.industry || '',
    loading: nameLoading || infoLoading,
    refresh: () => {
      refreshName();
      loadCompanyInfo();
    },
    reloadCompanyInfo: loadCompanyInfo
  };

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
};
