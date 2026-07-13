
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ServiceManagementPage } from './developer/ServiceManagementPage';
import { ApiDocumentationPage } from './developer/ApiDocumentationPage';
import { ApiToolsPage } from './developer/ApiToolsPage';
import UserManagement from './developer/UserManagement';
import SystemSettings from './developer/SystemSettings';
import SecuritySettings from './developer/SecuritySettings';
import AnalyticsDashboard from './developer/AnalyticsDashboard';
import ShoppingControls from './developer/ShoppingControls';
import ProductFormPage from './developer/ProductFormPage';
import TrialManagement from './developer/TrialManagement';
import PlatformDevelopers from './developer/PlatformDevelopers';
import { DeveloperNavigation } from '@/components/developer/DeveloperNavigation';
import AffiliateAnalyticsDashboard from '@/components/developer/analytics/AffiliateAnalyticsDashboard';

export default function DeveloperPortal() {
  return (
    <>
      <Helmet>
        <title>System Administration | All Business 365</title>
      </Helmet>
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">
            Platform administration and system tools
          </p>
        </div>
        
        <Routes>
          <Route path="/" element={<DeveloperNavigation />} />
          <Route path="/service-management/*" element={<ServiceManagementPage />} />
          <Route path="/api-docs" element={<ApiDocumentationPage />} />
          <Route path="/api-tools" element={<ApiToolsPage />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/system-settings" element={<SystemSettings />} />
          <Route path="/security" element={<SecuritySettings />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/shopping" element={<ShoppingControls />} />
          <Route path="/shopping-controls" element={<ShoppingControls />} />
          <Route path="/shopping/products/new" element={<ProductFormPage />} />
          <Route path="/shopping-controls/products/new" element={<ProductFormPage />} />
          <Route path="/shopping/products/edit/:productId" element={<ProductFormPage />} />
          <Route path="/shopping-controls/products/edit/:productId" element={<ProductFormPage />} />
          <Route path="/trials" element={<TrialManagement />} />
          <Route path="/platform-developers" element={<PlatformDevelopers />} />
          <Route path="/affiliate-analytics" element={<AffiliateAnalyticsDashboard />} />
        </Routes>
      </div>
    </>
  );
}
