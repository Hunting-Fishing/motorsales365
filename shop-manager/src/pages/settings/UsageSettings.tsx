import React from 'react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { ApiUsageCard } from '@/components/settings/ApiUsageCard';
import { TeamUsageDashboard } from '@/components/settings/TeamUsageDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users } from 'lucide-react';

export default function UsageSettings() {
  return (
    <SettingsPageLayout
      title="API Usage & Limits"
      description="Monitor your API usage, track costs, and manage your team's consumption"
    >
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Usage
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Usage
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal">
          <div className="max-w-2xl">
            <ApiUsageCard />
          </div>
        </TabsContent>
        
        <TabsContent value="team">
          <TeamUsageDashboard />
        </TabsContent>
      </Tabs>
    </SettingsPageLayout>
  );
}
