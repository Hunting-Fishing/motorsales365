import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportOverviewHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/overview')!;
  return <SectionHub title={section.title} description="Central overview, alerts, and reporting" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
