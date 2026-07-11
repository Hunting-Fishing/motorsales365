import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface IncidentMetrics {
  totalIncidents: number;
  incidentsByMonth: { month: string; count: number }[];
  incidentsBySeverity: { severity: string; count: number }[];
  incidentsByType: { type: string; count: number }[];
  trir: number; // Total Recordable Incident Rate
  dart: number; // Days Away, Restricted, or Transferred
}

export interface InspectionMetrics {
  totalInspections: number;
  passRate: number;
  inspectionsByMonth: { month: string; passed: number; failed: number }[];
  defectsByCategory: { category: string; count: number }[];
}

export interface CertificationMetrics {
  totalCertifications: number;
  validCount: number;
  expiringSoon: number;
  expired: number;
  byType: { type: string; count: number }[];
}

export interface ComplianceScore {
  overall: number;
  incidents: number;
  inspections: number;
  certifications: number;
  training: number;
}

export function useSafetyReports(dateRange?: { start: Date; end: Date }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [incidentMetrics, setIncidentMetrics] = useState<IncidentMetrics | null>(null);
  const [inspectionMetrics, setInspectionMetrics] = useState<InspectionMetrics | null>(null);
  const [certificationMetrics, setCertificationMetrics] = useState<CertificationMetrics | null>(null);
  const [complianceScore, setComplianceScore] = useState<ComplianceScore | null>(null);

  const startDate = dateRange?.start || subMonths(new Date(), 12);
  const endDate = dateRange?.end || new Date();

  useEffect(() => {
    if (shopId) {
      fetchReports();
    }
  }, [shopId, startDate, endDate]);

  const fetchReports = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchIncidentMetrics(),
        fetchInspectionMetrics(),
        fetchCertificationMetrics(),
        calculateComplianceScore()
      ]);
    } catch (error: any) {
      console.error('Error fetching safety reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load safety reports',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidentMetrics = async () => {
    const { data, error } = await supabase
      .from('safety_incidents')
      .select('*')
      .eq('shop_id', shopId)
      .gte('incident_date', startDate.toISOString())
      .lte('incident_date', endDate.toISOString());

    if (error) throw error;

    const incidents = data || [];
    
    // Calculate incidents by month
    const monthlyData: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const month = format(subMonths(new Date(), i), 'MMM yyyy');
      monthlyData[month] = 0;
    }
    
    incidents.forEach(inc => {
      const month = format(new Date(inc.incident_date), 'MMM yyyy');
      if (monthlyData[month] !== undefined) {
        monthlyData[month]++;
      }
    });

    // Severity breakdown
    const severityCounts: Record<string, number> = {};
    incidents.forEach(inc => {
      const sev = inc.severity || 'unknown';
      severityCounts[sev] = (severityCounts[sev] || 0) + 1;
    });

    // Type breakdown
    const typeCounts: Record<string, number> = {};
    incidents.forEach(inc => {
      const type = inc.incident_type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    setIncidentMetrics({
      totalIncidents: incidents.length,
      incidentsByMonth: Object.entries(monthlyData)
        .map(([month, count]) => ({ month, count }))
        .reverse(),
      incidentsBySeverity: Object.entries(severityCounts)
        .map(([severity, count]) => ({ severity, count })),
      incidentsByType: Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count })),
      trir: incidents.length > 0 ? (incidents.length / 200000) * 100 : 0,
      dart: 0
    });
  };

  const fetchInspectionMetrics = async () => {
    // Use vessel_inspections table as primary inspection data source
    const { data, error } = await supabase
      .from('vessel_inspections')
      .select('*')
      .eq('shop_id', shopId)
      .gte('inspection_date', startDate.toISOString())
      .lte('inspection_date', endDate.toISOString());

    if (error) throw error;

    const inspections = data || [];
    const passed = inspections.filter((i: any) => i.overall_status === 'safe' || i.overall_status === 'passed').length;
    
    setInspectionMetrics({
      totalInspections: inspections.length,
      passRate: inspections.length > 0 ? Math.round((passed / inspections.length) * 100) : 0,
      inspectionsByMonth: [],
      defectsByCategory: []
    });
  };

  const fetchCertificationMetrics = async () => {
    const { data, error } = await supabase
      .from('team_certifications')
      .select('*')
      .eq('shop_id', shopId);

    if (error) throw error;

    const certs = data || [];
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const expired = certs.filter(c => c.expiry_date && new Date(c.expiry_date) < now).length;
    const expiringSoon = certs.filter(c => {
      if (!c.expiry_date) return false;
      const exp = new Date(c.expiry_date);
      return exp >= now && exp <= thirtyDays;
    }).length;

    setCertificationMetrics({
      totalCertifications: certs.length,
      validCount: certs.length - expired,
      expiringSoon,
      expired,
      byType: []
    });
  };

  const calculateComplianceScore = async () => {
    // Simple compliance score calculation
    const scores = {
      incidents: 100,
      inspections: 100,
      certifications: 100,
      training: 100
    };

    // Deduct for incidents (each incident -5 points)
    if (incidentMetrics) {
      scores.incidents = Math.max(0, 100 - (incidentMetrics.totalIncidents * 5));
    }

    // Inspection pass rate
    if (inspectionMetrics) {
      scores.inspections = inspectionMetrics.passRate;
    }

    // Certification validity
    if (certificationMetrics && certificationMetrics.totalCertifications > 0) {
      scores.certifications = Math.round(
        (certificationMetrics.validCount / certificationMetrics.totalCertifications) * 100
      );
    }

    const overall = Math.round(
      (scores.incidents + scores.inspections + scores.certifications + scores.training) / 4
    );

    setComplianceScore({
      overall,
      ...scores
    });
  };

  return {
    loading,
    incidentMetrics,
    inspectionMetrics,
    certificationMetrics,
    complianceScore,
    refetch: fetchReports
  };
}
