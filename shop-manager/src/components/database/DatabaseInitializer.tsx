
import React, { useEffect, useState } from 'react';
import { startupDiagnostics } from '@/services/database/StartupDiagnostics';
import { databaseHealthMonitor } from '@/services/database/DatabaseHealthMonitor';
import { WorkOrderRepository } from '@/services/workOrder/WorkOrderRepository';

interface DatabaseInitializerProps {
  children: React.ReactNode;
}

export function DatabaseInitializer({ children }: DatabaseInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeDatabase = async () => {
      try {
        console.log('🚀 Initializing hardcoded database systems...');
        
        // Run startup diagnostics
        await startupDiagnostics.runStartupDiagnostics();
        
        // Test work orders access
        try {
          const workOrderRepo = new WorkOrderRepository();
          await workOrderRepo.findAll();
          console.log('📦 Work orders access verified');
        } catch (error) {
          console.warn('⚠️ Failed to verify work orders access:', error);
        }
        
        if (mounted) {
          setIsInitialized(true);
          console.log('✅ Database initialization completed');
        }
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
        if (mounted) {
          setInitializationError(error instanceof Error ? error.message : 'Unknown error');
          // Still set as initialized to allow the app to continue
          setIsInitialized(true);
        }
      }
    };

    initializeDatabase();

    return () => {
      mounted = false;
      // Cleanup monitoring on unmount
      databaseHealthMonitor.stopMonitoring();
    };
  }, []);

  // Show loading state briefly, then continue regardless
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing database systems...</p>
        </div>
      </div>
    );
  }

  // Log initialization error but continue
  if (initializationError) {
    console.error('⚠️ Database initialization had errors:', initializationError);
  }

  return <>{children}</>;
}
