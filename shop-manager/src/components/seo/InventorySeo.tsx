
import React from 'react';
import { EnhancedSeoHead } from '@/components/common/EnhancedSeoHead';
import { useShopName } from '@/hooks/useShopName';

export const InventorySeo: React.FC = () => {
  const { shopName } = useShopName();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Inventory Management System",
    "description": "Complete inventory management solution for automotive parts and supplies with real-time tracking and automated reordering",
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "Inventory Management System",
      "applicationCategory": "BusinessApplication"
    }
  };

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Inventory", url: "/inventory" }
  ];

  return (
    <EnhancedSeoHead
      title={`Automotive Parts Inventory Management System - ${shopName || "All Business 365"}`}
      description="Streamline your parts inventory with real-time tracking, automated reordering, and comprehensive stock management for automotive shops."
      keywords="automotive parts inventory, inventory management software, parts tracking system, auto parts management, inventory control system"
      structuredData={structuredData}
      breadcrumbs={breadcrumbs}
      canonicalUrl="https://easyshopmanager.com/inventory"
    />
  );
};
