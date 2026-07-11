
import React from 'react';
import { ServiceSectorsList } from '@/components/developer/service-management/ServiceSectorsList';
import { useServiceSectors } from '@/hooks/useServiceCategories';
import { Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ServiceOverviewPage() {
  const { sectors, loading, error, refetch } = useServiceSectors();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading live service hierarchy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Alert variant="destructive" className="mb-4">
          <Database className="h-4 w-4" />
          <AlertDescription>
            Error loading live service hierarchy: {error}
          </AlertDescription>
        </Alert>
        <button 
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry Loading Live Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          All data shown below is live from your Supabase database. No mock or sample data is displayed.
        </AlertDescription>
      </Alert>
      
      <ServiceSectorsList />
    </div>
  );
}
