
/**
 * Validates if a URL is a valid Amazon product link
 * @param url The URL to validate
 * @returns boolean indicating if the URL is a valid Amazon product link
 */
export const isValidAmazonLink = (url: string): boolean => {
  try {
    // Create a URL object to parse the URL
    const parsedUrl = new URL(url);
    
    // Check if the hostname contains amazon
    const isAmazonDomain = parsedUrl.hostname.includes('amazon');
    
    // Check if the path contains a product ID (/dp/ or /gp/product/)
    const hasProductPath = parsedUrl.pathname.includes('/dp/') || 
                          parsedUrl.pathname.includes('/gp/product/');
    
    return isAmazonDomain && hasProductPath;
  } catch (error) {
    // If URL parsing fails, it's not a valid URL
    return false;
  }
};

/**
 * Extracts the product ID from an Amazon URL
 * @param url The Amazon URL
 * @returns The product ID or null if not found
 */
export const extractAmazonProductId = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    
    // Check for /dp/ path
    if (parsedUrl.pathname.includes('/dp/')) {
      const match = parsedUrl.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
      return match ? match[1] : null;
    }
    
    // Check for /gp/product/ path
    if (parsedUrl.pathname.includes('/gp/product/')) {
      const match = parsedUrl.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
      return match ? match[1] : null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};
