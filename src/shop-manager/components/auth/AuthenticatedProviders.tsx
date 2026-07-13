import React from 'react';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { NotificationsProvider } from '@/context/notifications';
import { CompanyProvider } from '@/contexts/CompanyContext';

interface Props {
  children: React.ReactNode;
}

export const AuthenticatedProviders: React.FC<Props> = ({ children }) => (
  <ImpersonationProvider>
    <NotificationsProvider>
      <CompanyProvider>
        {children}
      </CompanyProvider>
    </NotificationsProvider>
  </ImpersonationProvider>
);
