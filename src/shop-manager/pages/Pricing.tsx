import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PricingSection } from '@/components/landing/PricingSection';

export default function Pricing() {
  return (
    <PublicLayout activeLink="pricing">
      <div className="py-12">
        <PricingSection />
      </div>
    </PublicLayout>
  );
}
