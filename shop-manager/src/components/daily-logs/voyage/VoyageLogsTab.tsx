import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Ship, Plus, History, Loader2 } from 'lucide-react';
import { useVoyageLogs } from '@/hooks/useVoyageLogs';
import { StartVoyageForm } from './StartVoyageForm';
import { ActiveVoyagePanel } from './ActiveVoyagePanel';
import { VoyageHistoryList } from './VoyageHistoryList';

export function VoyageLogsTab() {
  const { activeVoyage, isLoadingActive } = useVoyageLogs();
  const [showStartForm, setShowStartForm] = useState(false);

  if (isLoadingActive) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If there's an active voyage, show it
  if (activeVoyage) {
    return (
      <ActiveVoyagePanel 
        voyage={activeVoyage} 
        onVoyageEnded={() => {}} 
      />
    );
  }

  // If starting a new voyage
  if (showStartForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Start New Voyage</h3>
          <Button variant="outline" onClick={() => setShowStartForm(false)}>
            Cancel
          </Button>
        </div>
        <StartVoyageForm onSuccess={() => setShowStartForm(false)} />
      </div>
    );
  }

  // Default view: option to start voyage or view history
  return (
    <div className="space-y-6">
      {/* Start Voyage CTA */}
      <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
        <Ship className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Active Voyage</h3>
        <p className="text-muted-foreground text-sm mb-4 text-center max-w-md">
          Start a new voyage to log departure, communications, activities, and incidents for Transport Canada compliance.
        </p>
        <Button onClick={() => setShowStartForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Start New Voyage
        </Button>
      </div>

      {/* Voyage History */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <History className="h-5 w-5" />
          Voyage History
        </h3>
        <VoyageHistoryList />
      </div>
    </div>
  );
}
