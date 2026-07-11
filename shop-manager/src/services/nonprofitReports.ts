import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export interface ReportData {
  id: string;
  title: string;
  type: 'financial' | 'impact' | 'volunteer' | 'grant' | 'board';
  data: any;
  generatedAt: string;
  period: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  grantFunding: number;
  programExpenses: number;
  adminExpenses: number;
}

export interface ImpactMetrics {
  beneficiariesServed: number;
  programsCompleted: number;
  volunteerHours: number;
  communityReach: number;
  outcomesAchieved: string[];
}

export interface VolunteerMetrics {
  totalVolunteers: number;
  activeVolunteers: number;
  newVolunteers: number;
  totalHours: number;
  averageHoursPerVolunteer: number;
  retentionRate: number;
}

// Generate Financial Report
export const generateFinancialReport = async (
  startDate: string,
  endDate: string
): Promise<FinancialSummary> => {
  const { data: budgetEntries } = await supabase
    .from('budget_entries')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const revenue = budgetEntries
    ?.filter(entry => entry.budget_type === 'revenue')
    .reduce((sum, entry) => sum + entry.actual_amount, 0) || 0;

  const expenses = budgetEntries
    ?.filter(entry => entry.budget_type === 'expense')
    .reduce((sum, entry) => sum + entry.actual_amount, 0) || 0;

  const grantFunding = budgetEntries
    ?.filter(entry => entry.grant_id)
    .reduce((sum, entry) => sum + entry.actual_amount, 0) || 0;

  const programExpenses = budgetEntries
    ?.filter(entry => entry.program_id && entry.budget_type === 'expense')
    .reduce((sum, entry) => sum + entry.actual_amount, 0) || 0;

  return {
    totalRevenue: revenue,
    totalExpenses: expenses,
    netIncome: revenue - expenses,
    grantFunding,
    programExpenses,
    adminExpenses: expenses - programExpenses
  };
};

// Generate Impact Report
export const generateImpactReport = async (
  startDate: string,
  endDate: string
): Promise<ImpactMetrics> => {
  // Get nonprofit programs and their impact data
  const { data: programs } = await supabase
    .from('nonprofit_programs')
    .select(`
      *,
      nonprofit_program_volunteers(*)
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const beneficiariesServed = programs
    ?.reduce((sum, program) => sum + ((program as any).beneficiaries_count || 0), 0) || 0;

  const programsCompleted = programs
    ?.filter(program => program.status === 'completed').length || 0;

  const volunteerHours = programs
    ?.reduce((sum, program) => 
      sum + program.nonprofit_program_volunteers?.reduce((vSum: number, v: any) => 
        vSum + (v.hours_committed || 0), 0
      ), 0) || 0;

  return {
    beneficiariesServed,
    programsCompleted,
    volunteerHours,
    communityReach: beneficiariesServed * 2.5, // Estimated multiplier
    outcomesAchieved: programs?.map(p => p.description).filter(Boolean) || []
  };
};

// Generate Volunteer Report
export const generateVolunteerReport = async (
  startDate: string,
  endDate: string
): Promise<VolunteerMetrics> => {
  const { data: volunteers } = await supabase
    .from('nonprofits' as any)
    .select(`*`)
    .limit(0);

  const activeVolunteers = volunteers
    ?.filter((v: any) => v.status === 'active').length || 0;

  const newVolunteers = volunteers
    ?.filter((v: any) => 
      v.created_at >= startDate && 
      v.created_at <= endDate
    ).length || 0;

  const totalHours = volunteers
    ?.reduce((sum: number, volunteer: any) => 
      sum + (volunteer.nonprofit_program_volunteers?.reduce((vSum: number, pv: any) => 
        vSum + (pv.hours_committed || 0), 0
      ) || 0), 0) || 0;

  const totalVolunteers = volunteers?.length || 0;
  const averageHours = totalVolunteers > 0 ? totalHours / totalVolunteers : 0;

  // Calculate retention rate (simplified)
  const retentionRate = totalVolunteers > 0 ? (activeVolunteers / totalVolunteers) * 100 : 0;

  return {
    totalVolunteers,
    activeVolunteers,
    newVolunteers,
    totalHours,
    averageHoursPerVolunteer: averageHours,
    retentionRate
  };
};

// Generate Comprehensive Report
export const generateComprehensiveReport = async (
  type: 'monthly' | 'quarterly' | 'annual',
  date: Date = new Date()
): Promise<ReportData> => {
  const endDate = date.toISOString();
  let startDate: string;
  let period: string;

  switch (type) {
    case 'monthly':
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      startDate = monthStart.toISOString();
      period = format(date, 'MMMM yyyy');
      break;
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3);
      const quarterStart = new Date(date.getFullYear(), quarter * 3, 1);
      startDate = quarterStart.toISOString();
      period = `Q${quarter + 1} ${date.getFullYear()}`;
      break;
    case 'annual':
      const yearStart = new Date(date.getFullYear(), 0, 1);
      startDate = yearStart.toISOString();
      period = date.getFullYear().toString();
      break;
  }

  const [financial, impact, volunteer] = await Promise.all([
    generateFinancialReport(startDate, endDate),
    generateImpactReport(startDate, endDate),
    generateVolunteerReport(startDate, endDate)
  ]);

  const reportData = {
    financial,
    impact,
    volunteer,
    summary: {
      period,
      generatedAt: new Date().toISOString(),
      highlights: [
        `Generated ${financial.totalRevenue.toLocaleString()} in revenue`,
        `Served ${impact.beneficiariesServed} beneficiaries`,
        `${volunteer.totalVolunteers} active volunteers contributed ${volunteer.totalHours} hours`
      ]
    }
  };

  // Save report to database
  const { data: savedReport } = await supabase
    .from('nonprofit_reports')
    .insert({
      type: 'comprehensive',
      data: reportData,
      period,
      generated_at: new Date().toISOString()
    } as any)
    .select()
    .single();

  return {
    id: savedReport?.id || '',
    title: savedReport?.title || '',
    type: 'impact',
    data: reportData,
    generatedAt: savedReport?.generated_at || new Date().toISOString(),
    period
  };
};

// Schedule automated report generation
export const scheduleAutomatedReports = async () => {
  try {
    console.log("Scheduling automated report generation...");
    
    // This would typically be called by a cron job or scheduled function
    const now = new Date();
    
    // Generate monthly report on the 1st of each month
    if (now.getDate() === 1) {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      await generateComprehensiveReport('monthly', lastMonth);
      console.log("Monthly report generated");
    }
    
    // Generate quarterly report on the 1st of Jan, Apr, Jul, Oct
    if (now.getDate() === 1 && [0, 3, 6, 9].includes(now.getMonth())) {
      const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      await generateComprehensiveReport('quarterly', lastQuarter);
      console.log("Quarterly report generated");
    }
    
    // Generate annual report on Jan 1st
    if (now.getDate() === 1 && now.getMonth() === 0) {
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      await generateComprehensiveReport('annual', lastYear);
      console.log("Annual report generated");
    }
    
  } catch (error) {
    console.error("Error scheduling automated reports:", error);
  }
};

// Get saved reports
export const getReports = async (type?: string, limit: number = 10) => {
  let query = supabase
    .from('nonprofit_reports')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
  
  return data || [];
};