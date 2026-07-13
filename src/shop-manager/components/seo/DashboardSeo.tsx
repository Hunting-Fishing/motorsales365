
import React from 'react';
import { EnhancedSeoHead } from '@/components/common/EnhancedSeoHead';
import { useShopName } from '@/hooks/useShopName';

export const DashboardSeo: React.FC = () => {
  const { shopName } = useShopName();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Work Order Management Dashboard",
    "description": "Professional dashboard for managing work orders, tracking equipment maintenance, and monitoring shop performance metrics",
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": `${shopName || "All Business 365"} Dashboard`,
      "applicationCategory": "BusinessApplication"
    }
  };

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Dashboard", url: "/dashboard" }
  ];

  return (
    <EnhancedSeoHead
      title={`Work Order Management Dashboard - ${shopName || "All Business 365"}`}
      description="Monitor your automotive shop's performance with our comprehensive dashboard. Track work orders, equipment maintenance, inventory levels, and team efficiency in real-time."
      keywords="work order dashboard, shop management dashboard, automotive service dashboard, equipment maintenance tracking, inventory management system"
      structuredData={structuredData}
      breadcrumbs={breadcrumbs}
      canonicalUrl="https://easyshopmanager.com/dashboard"
    />
  );
};
