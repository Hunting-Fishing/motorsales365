import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PolicyFinding {
  table_schema: string
  table_name: string
  policy_name: string
  command: string
  qual: string
  severity: 'critical' | 'warning' | 'info'
  issue: string
}

interface AuditResult {
  timestamp: string
  total_tables_checked: number
  tables_without_rls: string[]
  qual_true_policies: PolicyFinding[]
  tables_missing_shop_id: string[]
  summary: {
    critical: number
    warning: number
    info: number
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting RLS security audit...')

    // 1. Find all tables without RLS enabled
    const { data: tablesWithoutRls, error: rlsError } = await supabase.rpc('get_tables_without_rls')
    
    if (rlsError) {
      console.error('Error checking RLS status:', rlsError)
    }

    // 2. Find all policies with qual = true (dangerous pattern)
    const { data: qualTruePolicies, error: policyError } = await supabase.rpc('get_qual_true_policies')
    
    if (policyError) {
      console.error('Error checking policies:', policyError)
    }

    // 3. Find tables with shop_id that might need tenant isolation
    const { data: tablesWithShopId, error: shopIdError } = await supabase.rpc('get_tables_with_shop_id')
    
    if (shopIdError) {
      console.error('Error checking shop_id tables:', shopIdError)
    }

    // Process findings
    const findings: PolicyFinding[] = []
    
    // Critical: SELECT policies with qual = true on shop-scoped tables
    const criticalTables = [
      'customers', 'work_orders', 'equipment_assets', 'inventory_items',
      'vehicles', 'invoices', 'quotes', 'appointments', 'profiles',
      'contacts', 'resources', 'email_campaigns', 'marketing_segments'
    ]

    if (qualTruePolicies) {
      for (const policy of qualTruePolicies) {
        const severity = criticalTables.includes(policy.table_name) ? 'critical' : 'warning'
        findings.push({
          table_schema: policy.table_schema,
          table_name: policy.table_name,
          policy_name: policy.policy_name,
          command: policy.command,
          qual: 'true',
          severity,
          issue: `SELECT policy allows access to all rows - potential data leakage`
        })
      }
    }

    // Count by severity
    const summary = {
      critical: findings.filter(f => f.severity === 'critical').length,
      warning: findings.filter(f => f.severity === 'warning').length,
      info: findings.filter(f => f.severity === 'info').length
    }

    const result: AuditResult = {
      timestamp: new Date().toISOString(),
      total_tables_checked: (tablesWithShopId?.length || 0) + (tablesWithoutRls?.length || 0),
      tables_without_rls: tablesWithoutRls?.map((t: any) => t.table_name) || [],
      qual_true_policies: findings,
      tables_missing_shop_id: [],
      summary
    }

    console.log(`Audit complete. Found ${summary.critical} critical, ${summary.warning} warning issues.`)

    // Store findings in database
    const { error: insertError } = await supabase
      .from('rls_security_findings')
      .insert({
        audit_timestamp: result.timestamp,
        critical_count: summary.critical,
        warning_count: summary.warning,
        info_count: summary.info,
        findings: result,
        tables_without_rls: result.tables_without_rls,
        qual_true_count: findings.length
      })

    if (insertError) {
      console.error('Error storing findings:', insertError)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Audit error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
