
import React, { useState, useEffect } from "react";
import { useNotifications } from "@/context/notifications";
import { toast } from "@/hooks/use-toast";
import { NotificationPreferences } from "@/types/notification";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConnectionStatusCard } from "./notifications/ConnectionStatusCard";
import { NotificationChannelsCard } from "./notifications/NotificationChannelsCard";
import { NotificationCategoriesCard } from "./notifications/NotificationCategoriesCard";
import { NotificationSoundCard } from "./notifications/NotificationSoundCard";
import { NotificationFrequencyCard } from "./notifications/NotificationFrequencyCard";
import { NotificationPreviewCard } from "./notifications/NotificationPreviewCard";
import { SaveButton } from "./notifications/SaveButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings } from "lucide-react";

export function NotificationsTab() {
  const { preferences, updatePreferences, triggerTestNotification, connectionStatus } = useNotifications();
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences>(preferences);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "changed">("idle");
  const [activeTab, setActiveTab] = useState<"general" | "advanced">("general");

  // Update local state when preferences change
  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  // Track changes to know when to show the save button
  useEffect(() => {
    if (JSON.stringify(localPrefs) !== JSON.stringify(preferences)) {
      setSaveStatus("changed");
    } else {
      setSaveStatus("idle");
    }
  }, [localPrefs, preferences]);

  // Handle saving preferences
  const handleSave = () => {
    updatePreferences(localPrefs);
    setSaveStatus("saved");
    
    toast({
      title: "Preferences saved",
      description: "Your notification preferences have been updated.",
    });
    
    // Reset status after a delay
    setTimeout(() => {
      setSaveStatus("idle");
    }, 3000);
  };

  // Handle toggling a notification channel
  const handleChannelToggle = (channel: keyof Pick<NotificationPreferences, 'email' | 'push' | 'inApp'>) => {
    setLocalPrefs(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };

  // Handle toggling a notification subscription
  const handleSubscriptionToggle = (category: string) => {
    setLocalPrefs(prev => ({
      ...prev,
      subscriptions: prev.subscriptions.map(sub => 
        sub.category === category ? { ...sub, enabled: !sub.enabled } : sub
      )
    }));
  };

  // Handle changing notification sound
  const handleSoundChange = (soundName: string) => {
    setLocalPrefs(prev => ({
      ...prev,
      sound: soundName
    }));
  };

  // Handle changing notification frequency
  const handleFrequencyChange = (category: string, frequency: 'realtime' | 'hourly' | 'daily' | 'weekly') => {
    setLocalPrefs(prev => ({
      ...prev,
      frequencies: {
        ...prev.frequencies,
        [category]: frequency
      }
    }));
  };

  // Handle sending a test notification
  const handleTestNotification = () => {
    triggerTestNotification();
    toast({
      title: "Test notification sent",
      description: "Check your notification bell to see the test notification.",
    });
  };

  return (
    <div className="space-y-6">
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <Settings className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Configuration Required:</strong> To enable automated email notifications for grants, budgets, and volunteer management, 
          please configure your Resend API key in the Supabase Edge Functions secrets.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "general" | "advanced")}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <ConnectionStatusCard 
            connectionStatus={connectionStatus} 
            onTestNotification={handleTestNotification} 
          />
          
          <NotificationChannelsCard 
            preferences={localPrefs} 
            onChannelToggle={handleChannelToggle} 
          />
          
          <NotificationCategoriesCard 
            preferences={localPrefs} 
            onSubscriptionToggle={handleSubscriptionToggle} 
          />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <NotificationSoundCard 
            selectedSound={localPrefs.sound || "default"} 
            onSoundChange={handleSoundChange}
          />

          <NotificationFrequencyCard 
            preferences={localPrefs} 
            onFrequencyChange={handleFrequencyChange}
          />

          <NotificationPreviewCard />
        </TabsContent>
      </Tabs>
      
      <SaveButton 
        saveStatus={saveStatus} 
        onSave={handleSave} 
      />
    </div>
  );
}
