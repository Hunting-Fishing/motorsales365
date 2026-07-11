import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportLogisticsHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/logistics')!;
  return <SectionHub title={section.title} description="Fleet, drivers, routes, ports, and shipping logistics" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
