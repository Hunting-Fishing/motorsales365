import React from 'react';
import { ImpersonationProvider } from '@sm/contexts/ImpersonationContext';
import { NotificationsProvider } from '@sm/context/notifications';
import { CompanyProvider } from '@sm/contexts/CompanyContext';

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
