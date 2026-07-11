import { supabase } from '@/lib/supabase';

export interface AuthMonitoringConfig {
  enableConsoleLogging?: boolean;
  enablePerformanceTracking?: boolean;
  enableErrorReporting?: boolean;
}

class AuthMonitor {
  private config: AuthMonitoringConfig;
  private startTime: number = Date.now();
  private authEventCounts: Record<string, number> = {};

  constructor(config: AuthMonitoringConfig = {}) {
    this.config = {
      enableConsoleLogging: true,
      enablePerformanceTracking: true,
      enableErrorReporting: true,
      ...config,
    };

    this.initialize();
  }

  private initialize() {
    if (this.config.enableConsoleLogging) {
      console.log('🔍 Auth Monitor initialized');
    }

    // Monitor auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.trackAuthEvent(event, session);
    });

    // Monitor session validity periodically
    if (this.config.enablePerformanceTracking) {
      this.startPeriodicSessionCheck();
    }
  }

  private trackAuthEvent(event: string, session: any) {
    this.authEventCounts[event] = (this.authEventCounts[event] || 0) + 1;

    if (this.config.enableConsoleLogging) {
      console.log(`🔍 Auth Event [${event}]:`, {
        userId: session?.user?.id?.substring(0, 8) + '...' || 'none',
        sessionValid: !!session,
        tokenExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none',
        eventCount: this.authEventCounts[event],
        timeSinceStart: Math.round((Date.now() - this.startTime) / 1000) + 's'
      });
    }

    // Detect potential issues
    this.detectAuthIssues(event, session);
  }

  private detectAuthIssues(event: string, session: any) {
    // Detect rapid sign-in/sign-out cycles
    if (this.authEventCounts['SIGNED_OUT'] > 3 && this.authEventCounts['SIGNED_IN'] > 3) {
      console.warn('⚠️ Auth Monitor: Detected rapid sign-in/out cycles. Possible session instability.');
    }

    // Detect token expiry issues
    if (session?.expires_at) {
      const expiryTime = new Date(session.expires_at * 1000);
      const timeUntilExpiry = expiryTime.getTime() - Date.now();
      
      if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
        console.warn('⚠️ Auth Monitor: Session token expires soon:', expiryTime.toISOString());
      }
    }

    // Detect authentication errors
    if (event === 'TOKEN_REFRESHED' && !session) {
      console.error('❌ Auth Monitor: Token refresh failed - session is null');
    }
  }

  private async startPeriodicSessionCheck() {
    const checkInterval = 60000; // 1 minute
    
    setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Auth Monitor: Periodic session check failed:', error.message);
          return;
        }

        if (!session) {
          console.warn('⚠️ Auth Monitor: No session found during periodic check');
          return;
        }

        // Check if session is close to expiry
        if (session.expires_at) {
          const expiryTime = new Date(session.expires_at * 1000);
          const timeUntilExpiry = expiryTime.getTime() - Date.now();
          
          if (timeUntilExpiry < 10 * 60 * 1000) { // Less than 10 minutes
            console.log('🔄 Auth Monitor: Session will expire soon, attempting refresh...');
            
            try {
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.error('❌ Auth Monitor: Session refresh failed:', refreshError.message);
              } else {
                console.log('✅ Auth Monitor: Session refreshed successfully');
              }
            } catch (refreshError) {
              console.error('❌ Auth Monitor: Session refresh error:', refreshError);
            }
          }
        }

        // Test database connectivity
        try {
          const { error: dbError } = await supabase
            .from('user_roles')
            .select('user_id')
            .limit(1);
          
          if (dbError) {
            console.error('❌ Auth Monitor: Database connectivity test failed:', dbError.message);
          }
        } catch (dbError) {
          console.error('❌ Auth Monitor: Database connectivity error:', dbError);
        }

      } catch (error) {
        console.error('❌ Auth Monitor: Periodic check error:', error);
      }
    }, checkInterval);
  }

  public getAuthStats() {
    return {
      eventCounts: { ...this.authEventCounts },
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      startTime: new Date(this.startTime).toISOString(),
    };
  }

  public async testAuthFlow() {
    console.log('🧪 Auth Monitor: Testing authentication flow...');
    
    const tests = [
      { name: 'Session Check', fn: () => supabase.auth.getSession() },
      { name: 'User Check', fn: () => supabase.auth.getUser() },
      { name: 'Database Query', fn: () => supabase.from('user_roles').select('user_id').limit(1) },
    ];

    const results = [];
    
    for (const test of tests) {
      try {
        const startTime = performance.now();
        const result = await test.fn();
        const duration = performance.now() - startTime;
        
        results.push({
          name: test.name,
          success: !result.error,
          duration: Math.round(duration),
          error: result.error?.message || null,
        });
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.table(results);
    return results;
  }
}

// Singleton instance
export const authMonitor = new AuthMonitor();

// Development helper
if (typeof window !== 'undefined') {
  (window as any).authMonitor = authMonitor;
}