import React, { useEffect, useRef } from 'react';

const AFFILIATE_VERIFICATION_SCRIPTS = [
  {
    id: 'avantlink',
    src: 'https://classic.avantlink.com/affiliate_app_confirm.php?mode=js&authResponse=a90f3305d34906a4a71523b93d9a7d2eb3423e59',
  },
];

export default function AffiliateVerification() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    AFFILIATE_VERIFICATION_SCRIPTS.forEach((scriptConfig) => {
      if (container.querySelector(`script[data-affiliate-id="${scriptConfig.id}"]`)) {
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = scriptConfig.src;
      script.setAttribute('data-affiliate-id', scriptConfig.id);
      container.appendChild(script);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-3">
        <h1 className="text-3xl font-bold text-foreground">Affiliate Verification</h1>
        <p className="text-muted-foreground">
          This page hosts affiliate verification scripts. Keep it public for provider checks.
        </p>
        <div ref={containerRef} />
      </div>
    </div>
  );
}
