import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportOrdersHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/orders')!;
  return <SectionHub title={section.title} description="Manage orders, quotes, contracts, shipments, and returns" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
