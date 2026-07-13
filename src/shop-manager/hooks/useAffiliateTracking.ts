import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { trackAffiliateClick } from '@/services/affiliateTrackingService';

export const useAffiliateTracking = (moduleId?: string) => {
  const location = useLocation();

  const trackClick = useCallback((linkType: 'banner' | 'sidebar', linkUrl: string) => {
    trackAffiliateClick({
      linkUrl,
      linkType,
      moduleId,
      referrerPath: location.pathname,
      metadata: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }
    });
  }, [moduleId, location.pathname]);

  return { trackClick };
};
