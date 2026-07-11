import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportImportHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/import')!;
  return <SectionHub title={section.title} description="Purchase orders, receiving, customs clearance, and invoices" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
