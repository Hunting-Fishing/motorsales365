import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportCommunicationHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/communication')!;
  return <SectionHub title={section.title} description="Messaging, customer portal, and EDI integrations" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
