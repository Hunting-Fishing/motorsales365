import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AmazonBuyButtonProps {
  asin: string;
  affiliateTag?: string;
  supplementName?: string;
  className?: string;
  size?: 'sm' | 'default';
}

export function AmazonBuyButton({ asin, affiliateTag, supplementName, className, size = 'sm' }: AmazonBuyButtonProps) {
  const tag = affiliateTag || 'fitnesspro-20';
  const url = `https://www.amazon.com/dp/${asin}?tag=${tag}`;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Track affiliate click
    try {
      await supabase.from('affiliate_link_clicks').insert({
        link_type: 'amazon',
        link_url: url,
        referrer_path: window.location.pathname,
        metadata: { asin, supplement_name: supplementName, tag } as any,
      });
    } catch {}
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      size={size}
      variant="outline"
      className={`gap-1.5 bg-[#FF9900]/10 border-[#FF9900]/30 text-[#FF9900] hover:bg-[#FF9900]/20 hover:text-[#FF9900] ${className || ''}`}
      onClick={handleClick}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      Buy on Amazon
    </Button>
  );
}
