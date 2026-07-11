
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wrench } from 'lucide-react';
import { ServiceManagementNavigation } from '@/components/developer/service-management/ServiceManagementNavigation';
import { ServiceOverviewPage } from './service-management/ServiceOverviewPage';
import { ServiceTreeViewPage } from './service-management/ServiceTreeViewPage';
import { ServiceExcelViewPage } from './service-management/ServiceExcelViewPage';
import { ServiceImportPage } from './service-management/ServiceImportPage';

export function ServiceManagementPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="outline" size="sm" className="mb-4" asChild>
          <Link to="/system-admin">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Developer Portal
          </Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Wrench className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Service Management</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Manage service hierarchy, categories, subcategories, and import service jobs
        </p>
      </div>

      <div className="mb-6">
        <ServiceManagementNavigation />
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="overview" replace />} />
        <Route path="/overview" element={<ServiceOverviewPage />} />
        <Route path="/tree" element={<ServiceTreeViewPage />} />
        <Route path="/excel" element={<ServiceExcelViewPage />} />
        <Route path="/import" element={<ServiceImportPage />} />
      </Routes>
    </div>
  );
}
