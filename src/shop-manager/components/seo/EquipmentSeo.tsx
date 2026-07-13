
import React from 'react';
import { EnhancedSeoHead } from '@/components/common/EnhancedSeoHead';
import { useShopName } from '@/hooks/useShopName';

export const EquipmentSeo: React.FC = () => {
  const { shopName } = useShopName();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Equipment Maintenance Tracking",
    "description": "Track and manage all your shop equipment, schedule maintenance, monitor warranties, and ensure optimal performance",
    "mainEntity": {
      "@type": "Product",
      "name": "Equipment Management System",
      "category": "Business Software"
    }
  };

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Equipment", url: "/equipment" }
  ];

  return (
    <EnhancedSeoHead
      title={`Equipment Maintenance Tracking & Management - ${shopName || "All Business 365"}`}
      description="Comprehensive equipment tracking system for automotive shops. Schedule maintenance, track warranties, monitor equipment status, and prevent costly breakdowns."
      keywords="equipment maintenance software, equipment tracking system, maintenance scheduling, warranty management, shop equipment management"
      structuredData={structuredData}
      breadcrumbs={breadcrumbs}
      canonicalUrl="https://easyshopmanager.com/equipment"
    />
  );
};
