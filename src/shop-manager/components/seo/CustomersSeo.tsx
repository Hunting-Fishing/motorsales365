
import React from 'react';
import { EnhancedSeoHead } from '@/components/common/EnhancedSeoHead';
import { useShopName } from '@/hooks/useShopName';

export const CustomersSeo: React.FC = () => {
  const { shopName } = useShopName();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Customer Management System",
    "description": "Manage customer relationships, track service history, and build lasting relationships with automotive service CRM",
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "Customer Relationship Management",
      "applicationCategory": "BusinessApplication"
    }
  };

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Customers", url: "/customers" }
  ];

  return (
    <EnhancedSeoHead
      title={`Customer Management & CRM for Automotive Shops - ${shopName || "All Business 365"}`}
      description="Powerful customer relationship management system for automotive shops. Track customer history, manage vehicle records, and provide exceptional service."
      keywords="automotive CRM, customer management software, vehicle service history, customer database, automotive customer tracking"
      structuredData={structuredData}
      breadcrumbs={breadcrumbs}
      canonicalUrl="https://easyshopmanager.com/customers"
    />
  );
};
