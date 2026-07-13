import React from 'react';
import { PublicLayout } from '@sm/components/layout/PublicLayout';
import { PricingSection } from '@sm/components/landing/PricingSection';

export default function Pricing() {
  return (
    <PublicLayout activeLink="pricing">
      <div className="py-12">
        <PricingSection />
      </div>
    </PublicLayout>
  );
}
