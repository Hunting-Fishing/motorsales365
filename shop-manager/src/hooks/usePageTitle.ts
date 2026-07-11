
import { useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';

export const usePageTitle = (pageTitle: string, includeCompanyName = true) => {
  const { companyName } = useCompany();

  useEffect(() => {
    if (includeCompanyName && companyName) {
      document.title = `${pageTitle} | ${companyName}`;
    } else {
      document.title = pageTitle;
    }

    return () => {
      document.title = companyName || 'All Business 365';
    };
  }, [pageTitle, companyName, includeCompanyName]);
};
