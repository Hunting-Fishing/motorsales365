import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportDocumentsHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/documents')!;
  return <SectionHub title={section.title} description="Documents, customs, certificates, and compliance" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
