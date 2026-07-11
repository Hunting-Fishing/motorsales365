import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportCustomersHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/customers')!;
  return <SectionHub title={section.title} description="Clients, suppliers, agents, and product catalog" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
