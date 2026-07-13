
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface EnhancedSeoHeadProps {
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
  canonicalUrl?: string;
  structuredData?: object;
  breadcrumbs?: Array<{ name: string; url: string }>;
  imageUrl?: string;
  noIndex?: boolean;
}

export const EnhancedSeoHead: React.FC<EnhancedSeoHeadProps> = ({ 
  title, 
  description, 
  keywords, 
  ogType = "website",
  canonicalUrl,
  structuredData,
  breadcrumbs,
  imageUrl,
  noIndex = false
}) => {
  // For now, keep All Business 365 as default - in the future this could use a shop context
  const shopName = 'All Business 365';
  const fullTitle = title.includes(shopName) ? title : `${title} | ${shopName}`;
  const defaultImageUrl = imageUrl || 'https://lovable.dev/opengraph-image-p98pqg.png';
  
  // Generate breadcrumb structured data
  const breadcrumbSchema = breadcrumbs ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  } : null;

  // Default organization schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": shopName,
    "description": "Professional work order management system for automotive shops and service businesses",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": shopName
    }
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={defaultImageUrl} />
      <meta property="og:site_name" content={shopName} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={defaultImageUrl} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
      
      {/* Breadcrumb Schema */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
      
      {/* Organization Schema */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
    </Helmet>
  );
};
