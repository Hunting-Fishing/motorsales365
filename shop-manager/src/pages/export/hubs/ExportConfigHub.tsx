import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportConfigHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/config')!;
  return <SectionHub title={section.title} description="Staff management and module settings" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
