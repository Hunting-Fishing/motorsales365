import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportAnalyticsHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/analytics')!;
  return <SectionHub title={section.title} description="Trade lane analytics, KPIs, and demand forecasting" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
