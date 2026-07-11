
import React from 'react';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SmsTemplatesList } from '@/components/sms/SmsTemplatesList';

export default function SmsTemplates() {
  return (
    <ResponsiveContainer className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">SMS Templates</h1>
          <p className="text-muted-foreground">
            Manage your SMS message templates for customer communications
          </p>
        </div>
      </div>

      <SmsTemplatesList />
    </ResponsiveContainer>
  );
}
