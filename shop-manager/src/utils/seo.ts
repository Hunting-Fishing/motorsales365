
/**
 * SEO utility functions for shop management
 */

export const generatePageTitle = (pageTitle: string, shopName?: string, includeAppName = true): string => {
  const appName = shopName || 'All Business 365';
  if (includeAppName && !pageTitle.includes(appName)) {
    return `${pageTitle} | ${appName}`;
  }
  return pageTitle;
};

export const generateMetaDescription = (content: string, maxLength = 160): string => {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + '...';
};

export const generateKeywords = (primary: string[], secondary: string[] = []): string => {
  return [...primary, ...secondary].join(', ');
};

export const createBreadcrumbs = (path: string): Array<{ name: string; url: string }> => {
  const pathSegments = path.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Home', url: '/' }];
  
  let currentPath = '';
  pathSegments.forEach(segment => {
    currentPath += `/${segment}`;
    const name = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
    breadcrumbs.push({ name, url: currentPath });
  });
  
  return breadcrumbs;
};

// Common keywords for the application
export const SEO_KEYWORDS = {
  primary: [
    'work order management',
    'equipment tracking',
    'inventory management',
    'automotive shop software',
    'customer management'
  ],
  secondary: [
    'maintenance scheduling',
    'service business software',
    'shop management system',
    'automotive CRM',
    'parts inventory'
  ],
  longTail: [
    'professional work order management system',
    'equipment maintenance tracking software',
    'automotive shop inventory control',
    'customer relationship management for shops'
  ]
};
