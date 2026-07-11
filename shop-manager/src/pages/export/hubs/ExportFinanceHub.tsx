import { SectionHub } from '@/components/export/SectionHub';
import { navSections } from '@/components/export/exportNavData';

export default function ExportFinanceHub() {
  const section = navSections.find(s => s.hubRoute === '/export/hub/finance')!;
  return <SectionHub title={section.title} description="Invoices, payments, trade finance, and profitability" items={section.items} icon={section.hubIcon} color={section.hubColor} />;
}
