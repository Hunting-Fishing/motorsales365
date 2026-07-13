
import { supabase } from '@/lib/supabase';

/**
 * Shop Data Audit Utility
 * Comprehensive analysis of shop data flow and persistence
 */

export interface ShopDataFlow {
  source: string;
  target: string;
  status: 'working' | 'broken' | 'needs_verification';
  issues: string[];
  recommendations: string[];
}

export interface ShopDataAuditResult {
  overallStatus: 'healthy' | 'issues_found' | 'critical_issues';
  flows: ShopDataFlow[];
  summary: {
    workingFlows: number;
    brokenFlows: number;
    needsVerification: number;
    criticalIssues: string[];
  };
}

/**
 * Audit shop data persistence across the application
 */
export const auditShopDataFlow = async (): Promise<ShopDataAuditResult> => {
  const flows: ShopDataFlow[] = [];
  const criticalIssues: string[] = [];

  // 1. Check shops table structure and data
  try {
    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .limit(1);
    
    if (shopError) {
      criticalIssues.push(`Shops table access error: ${shopError.message}`);
      flows.push({
        source: 'shops_table',
        target: 'database',
        status: 'broken',
        issues: [`Database error: ${shopError.message}`],
        recommendations: ['Check Supabase connection and table permissions']
      });
    } else {
      flows.push({
        source: 'shops_table',
        target: 'database',
        status: 'working',
        issues: [],
        recommendations: []
      });
    }
  } catch (error) {
    criticalIssues.push(`Failed to access shops table: ${error}`);
  }

  // 2. Check company_settings table
  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1);
    
    if (settingsError) {
      flows.push({
        source: 'company_settings',
        target: 'database',
        status: 'broken',
        issues: [`Settings table error: ${settingsError.message}`],
        recommendations: ['Verify company_settings table exists and has proper RLS policies']
      });
    } else {
      flows.push({
        source: 'company_settings',
        target: 'database',
        status: 'working',
        issues: [],
        recommendations: []
      });
    }
  } catch (error) {
    criticalIssues.push(`Failed to access company_settings table: ${error}`);
  }

  // 3. Check shop_settings table
  try {
    const { data: shopSettingsData, error: shopSettingsError } = await supabase
      .from('shop_settings')
      .select('*')
      .limit(1);
    
    if (shopSettingsError) {
      flows.push({
        source: 'shop_settings',
        target: 'database',
        status: 'broken',
        issues: [`Shop settings error: ${shopSettingsError.message}`],
        recommendations: ['Check shop_settings table structure and permissions']
      });
    } else {
      flows.push({
        source: 'shop_settings',
        target: 'database',
        status: 'working',
        issues: [],
        recommendations: []
      });
    }
  } catch (error) {
    criticalIssues.push(`Failed to access shop_settings table: ${error}`);
  }

  // 4. Analyze data consistency
  flows.push({
    source: 'settings_forms',
    target: 'multiple_tables',
    status: 'needs_verification',
    issues: [
      'Shop data is scattered across multiple tables (shops, company_settings, shop_settings)',
      'No clear primary source of truth for shop information',
      'Potential data synchronization issues'
    ],
    recommendations: [
      'Consolidate shop data logic into unified service',
      'Create clear data flow documentation',
      'Implement data validation and synchronization'
    ]
  });

  // 5. Check for data update mechanisms
  flows.push({
    source: 'settings_components',
    target: 'database_updates',
    status: 'needs_verification',
    issues: [
      'Multiple components may be updating shop data independently',
      'No centralized shop data management',
      'Unclear error handling for failed updates'
    ],
    recommendations: [
      'Create unified shop data service',
      'Implement proper error handling and user feedback',
      'Add data validation before updates'
    ]
  });

  // Calculate summary
  const workingFlows = flows.filter(f => f.status === 'working').length;
  const brokenFlows = flows.filter(f => f.status === 'broken').length;
  const needsVerification = flows.filter(f => f.status === 'needs_verification').length;

  const overallStatus: ShopDataAuditResult['overallStatus'] = 
    criticalIssues.length > 0 || brokenFlows > 0 ? 'critical_issues' :
    needsVerification > 0 ? 'issues_found' : 'healthy';

  return {
    overallStatus,
    flows,
    summary: {
      workingFlows,
      brokenFlows,
      needsVerification,
      criticalIssues
    }
  };
};

/**
 * Generate detailed audit report
 */
export const generateShopDataAuditReport = async (): Promise<string> => {
  const audit = await auditShopDataFlow();
  
  let report = `# Shop Data Flow Audit Report\n\n`;
  report += `**Overall Status**: ${audit.overallStatus.toUpperCase()}\n\n`;
  
  if (audit.summary.criticalIssues.length > 0) {
    report += `## 🚨 Critical Issues\n`;
    audit.summary.criticalIssues.forEach(issue => {
      report += `- ${issue}\n`;
    });
    report += `\n`;
  }
  
  report += `## Summary\n`;
  report += `- ✅ Working flows: ${audit.summary.workingFlows}\n`;
  report += `- ❌ Broken flows: ${audit.summary.brokenFlows}\n`;
  report += `- ⚠️ Needs verification: ${audit.summary.needsVerification}\n\n`;
  
  report += `## Detailed Analysis\n\n`;
  
  audit.flows.forEach((flow, index) => {
    const statusIcon = flow.status === 'working' ? '✅' : 
                      flow.status === 'broken' ? '❌' : '⚠️';
    
    report += `### ${index + 1}. ${statusIcon} ${flow.source} → ${flow.target}\n`;
    report += `**Status**: ${flow.status}\n\n`;
    
    if (flow.issues.length > 0) {
      report += `**Issues**:\n`;
      flow.issues.forEach(issue => {
        report += `- ${issue}\n`;
      });
      report += `\n`;
    }
    
    if (flow.recommendations.length > 0) {
      report += `**Recommendations**:\n`;
      flow.recommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
      report += `\n`;
    }
  });
  
  return report;
};

/**
 * Test shop data operations
 */
export const testShopDataOperations = async () => {
  console.log('=== Shop Data Operations Test ===');
  
  try {
    // Test reading shop data
    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .limit(1)
      .single();
    
    if (shopError) {
      console.error('❌ Failed to read shop data:', shopError.message);
      return false;
    }
    
    console.log('✅ Shop data read successfully:', shopData?.name || 'No name set');
    
    // Test company settings
    const { data: companySettings, error: companyError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1);
    
    if (companyError) {
      console.error('❌ Failed to read company settings:', companyError.message);
    } else {
      console.log('✅ Company settings accessible:', companySettings?.length || 0, 'records');
    }
    
    // Test shop settings
    const { data: shopSettings, error: shopSettingsError } = await supabase
      .from('shop_settings')
      .select('*')
      .limit(1);
    
    if (shopSettingsError) {
      console.error('❌ Failed to read shop settings:', shopSettingsError.message);
    } else {
      console.log('✅ Shop settings accessible:', shopSettings?.length || 0, 'records');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Shop data operations test failed:', error);
    return false;
  }
};
