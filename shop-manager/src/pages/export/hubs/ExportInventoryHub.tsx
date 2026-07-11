import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportInventoryHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/inventory')!;
  return <SectionHub title={section.title} description="Stock, warehouses, packaging, and equipment" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
