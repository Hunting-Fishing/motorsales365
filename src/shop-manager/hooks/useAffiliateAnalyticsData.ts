import { useQuery } from '@tanstack/react-query';
import { getAffiliateAnalytics, AffiliateClickRecord } from '@/services/affiliateTrackingService';
import { format, subDays, startOfDay, isToday, isThisWeek, parseISO } from 'date-fns';

interface DailyClick {
  date: string;
  clicks: number;
}

interface ModuleClick {
  module: string;
  clicks: number;
}

interface SourceDistribution {
  name: string;
  value: number;
}

interface HourlyDistribution {
  hour: string;
  clicks: number;
}

export interface AffiliateAnalyticsData {
  totalClicks: number;
  clicksToday: number;
  clicksThisWeek: number;
  bannerClicks: number;
  sidebarClicks: number;
  bannerPercentage: number;
  dailyClicks: DailyClick[];
  clicksByModule: ModuleClick[];
  sourceDistribution: SourceDistribution[];
  hourlyDistribution: HourlyDistribution[];
  recentClicks: AffiliateClickRecord[];
}

const aggregateByDay = (data: AffiliateClickRecord[], days: number): DailyClick[] => {
  const result: Record<string, number> = {};
  
  // Initialize all days with 0 clicks
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'MMM dd');
    result[date] = 0;
  }
  
  // Count clicks per day
  data.forEach(click => {
    const date = format(parseISO(click.created_at), 'MMM dd');
    if (result[date] !== undefined) {
      result[date]++;
    }
  });
  
  return Object.entries(result).map(([date, clicks]) => ({ date, clicks }));
};

const aggregateByModule = (data: AffiliateClickRecord[]): ModuleClick[] => {
  const counts: Record<string, number> = {};
  
  data.forEach(click => {
    const module = click.module_id || 'Unknown';
    counts[module] = (counts[module] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([module, clicks]) => ({ 
      module: module.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
      clicks 
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);
};

const aggregateByType = (data: AffiliateClickRecord[]): SourceDistribution[] => {
  const banner = data.filter(d => d.link_type === 'banner').length;
  const sidebar = data.filter(d => d.link_type === 'sidebar').length;
  
  return [
    { name: 'Banner', value: banner },
    { name: 'Sidebar', value: sidebar },
  ];
};

const aggregateByHour = (data: AffiliateClickRecord[]): HourlyDistribution[] => {
  const counts: Record<string, number> = {};
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0') + ':00';
    counts[hour] = 0;
  }
  
  data.forEach(click => {
    const hour = format(parseISO(click.created_at), 'HH') + ':00';
    counts[hour]++;
  });
  
  return Object.entries(counts).map(([hour, clicks]) => ({ hour, clicks }));
};

const countToday = (data: AffiliateClickRecord[]): number => {
  return data.filter(d => isToday(parseISO(d.created_at))).length;
};

const countThisWeek = (data: AffiliateClickRecord[]): number => {
  return data.filter(d => isThisWeek(parseISO(d.created_at))).length;
};

export const useAffiliateAnalyticsData = (days: number = 30) => {
  return useQuery({
    queryKey: ['affiliate-analytics', days],
    queryFn: () => getAffiliateAnalytics(days),
    select: (data): AffiliateAnalyticsData => {
      const bannerClicks = data.filter(d => d.link_type === 'banner').length;
      const sidebarClicks = data.filter(d => d.link_type === 'sidebar').length;
      const totalClicks = data.length;
      
      return {
        totalClicks,
        clicksToday: countToday(data),
        clicksThisWeek: countThisWeek(data),
        bannerClicks,
        sidebarClicks,
        bannerPercentage: totalClicks > 0 ? Math.round((bannerClicks / totalClicks) * 100) : 0,
        dailyClicks: aggregateByDay(data, days),
        clicksByModule: aggregateByModule(data),
        sourceDistribution: aggregateByType(data),
        hourlyDistribution: aggregateByHour(data),
        recentClicks: data.slice(0, 50),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
