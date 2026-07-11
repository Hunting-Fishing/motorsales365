
import { supabase } from '@/integrations/supabase/client';

export interface HealthCheck {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  timestamp: string;
  responseTime?: number;
}

export interface DatabaseDiagnostics {
  status: 'healthy' | 'warning' | 'error';
  checks: HealthCheck[];
  overall_health: number;
  last_check: string;
}

export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastDiagnostics: DatabaseDiagnostics | null = null;

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  async runHealthCheck(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    const startTime = Date.now();

    try {
      // Test basic connection
      const { data, error } = await supabase.from('work_orders').select('count').limit(1);
      const responseTime = Date.now() - startTime;

      if (error) {
        checks.push({
          component: 'Database Connection',
          status: 'error',
          message: `Connection failed: ${error.message}`,
          timestamp: new Date().toISOString(),
          responseTime
        });
      } else {
        checks.push({
          component: 'Database Connection',
          status: 'healthy',
          message: 'Connection successful',
          timestamp: new Date().toISOString(),
          responseTime
        });
      }
    } catch (error) {
      checks.push({
        component: 'Database Connection',
        status: 'error',
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });
    }

    return checks;
  }

  async getDiagnostics(): Promise<DatabaseDiagnostics> {
    const checks = await this.runHealthCheck();
    
    const errorCount = checks.filter(c => c.status === 'error').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (errorCount > 0) {
      overallStatus = 'error';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    }

    const diagnostics: DatabaseDiagnostics = {
      status: overallStatus,
      checks,
      overall_health: Math.max(0, 100 - (errorCount * 40) - (warningCount * 20)),
      last_check: new Date().toISOString()
    };

    this.lastDiagnostics = diagnostics;
    return diagnostics;
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('🔍 Database monitoring already running');
      return;
    }

    console.log('🚀 Starting database health monitoring...');
    this.isMonitoring = true;

    // Initial check
    await this.getDiagnostics();

    // Set up periodic monitoring every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      if (this.isMonitoring) {
        try {
          await this.getDiagnostics();
          console.log('🔍 Database health check completed');
        } catch (error) {
          console.error('❌ Database health check failed:', error);
        }
      }
    }, 30000);

    console.log('✅ Database monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Database monitoring stopped');
  }

  getLastDiagnostics(): DatabaseDiagnostics | null {
    return this.lastDiagnostics;
  }

  isHealthy(): boolean {
    return this.lastDiagnostics?.status === 'healthy' || false;
  }
}

export const databaseHealthMonitor = DatabaseHealthMonitor.getInstance();
