
import { databaseHealthMonitor } from './DatabaseHealthMonitor';
import { WorkOrderRepository } from '../workOrder/WorkOrderRepository';

export interface DiagnosticResult {
  component: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export class StartupDiagnostics {
  private static instance: StartupDiagnostics;
  private diagnosticResults: DiagnosticResult[] = [];

  static getInstance(): StartupDiagnostics {
    if (!StartupDiagnostics.instance) {
      StartupDiagnostics.instance = new StartupDiagnostics();
    }
    return StartupDiagnostics.instance;
  }

  async runStartupDiagnostics(): Promise<DiagnosticResult[]> {
    console.log('🚀 Running startup diagnostics...');
    this.diagnosticResults = [];

    // Test database connection
    await this.testDatabaseConnection();

    // Test work orders accessibility
    await this.testWorkOrdersAccess();

    // Test work order repository
    await this.testWorkOrderRepository();

    // Start health monitoring
    await this.startHealthMonitoring();

    console.log('📋 Startup diagnostics completed:', this.diagnosticResults);
    return this.diagnosticResults;
  }

  private async testDatabaseConnection(): Promise<void> {
    try {
      const diagnostics = await databaseHealthMonitor.getDiagnostics();
      
      if (diagnostics.status === 'healthy') {
        this.addResult({
          component: 'Database Connection',
          status: 'success',
          message: 'Database connection established successfully',
          details: diagnostics.checks
        });
      } else {
        this.addResult({
          component: 'Database Connection',
          status: diagnostics.status === 'warning' ? 'warning' : 'error',
          message: 'Database connection issues detected',
          details: diagnostics.checks
        });
      }
    } catch (error) {
      this.addResult({
        component: 'Database Connection',
        status: 'error',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private async testWorkOrdersAccess(): Promise<void> {
    try {
      const workOrderRepo = new WorkOrderRepository();
      const workOrders = await workOrderRepo.findAll();
      
      this.addResult({
        component: 'Work Orders Access',
        status: 'success',
        message: `Successfully loaded ${workOrders.length} work orders from database`,
        details: {
          count: workOrders.length
        }
      });
    } catch (error) {
      this.addResult({
        component: 'Work Orders Access',
        status: 'error',
        message: `Failed to load work orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private async testWorkOrderRepository(): Promise<void> {
    try {
      const workOrderRepo = new WorkOrderRepository();
      // Test basic connectivity
      await workOrderRepo.findAll();
      
      this.addResult({
        component: 'Work Order Repository',
        status: 'success',
        message: 'Work order repository initialized successfully'
      });
    } catch (error) {
      this.addResult({
        component: 'Work Order Repository',
        status: 'error',
        message: `Work order repository initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private async startHealthMonitoring(): Promise<void> {
    try {
      await databaseHealthMonitor.startMonitoring();
      
      this.addResult({
        component: 'Health Monitoring',
        status: 'success',
        message: 'Database health monitoring started successfully'
      });
    } catch (error) {
      this.addResult({
        component: 'Health Monitoring',
        status: 'warning',
        message: `Health monitoring failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private addResult(result: DiagnosticResult): void {
    this.diagnosticResults.push({
      ...result,
      details: result.details || {}
    });
  }

  getLastResults(): DiagnosticResult[] {
    return this.diagnosticResults;
  }

  hasErrors(): boolean {
    return this.diagnosticResults.some(result => result.status === 'error');
  }

  hasWarnings(): boolean {
    return this.diagnosticResults.some(result => result.status === 'warning');
  }
}

export const startupDiagnostics = StartupDiagnostics.getInstance();
