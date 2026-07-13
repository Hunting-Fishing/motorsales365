
import React from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationPreferences } from "@/types/notification";
import { Clock, Bell } from "lucide-react";

interface NotificationFrequencyCardProps {
  preferences: NotificationPreferences;
  onFrequencyChange: (category: string, frequency: 'realtime' | 'hourly' | 'daily' | 'weekly') => void;
}

export function NotificationFrequencyCard({ preferences, onFrequencyChange }: NotificationFrequencyCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Notification Frequency</CardTitle>
          <CardDescription>
            Control how often you receive notifications by category
          </CardDescription>
        </div>
        <Clock className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {preferences.subscriptions.map((subscription) => (
            <div key={subscription.category} className="grid grid-cols-2 items-center gap-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium capitalize">
                  {subscription.category === 'workOrder' ? 'Work Order' : subscription.category} Updates
                </span>
              </div>
              <Select
                value={preferences.frequencies?.[subscription.category] || 'realtime'}
                onValueChange={(value) => onFrequencyChange(
                  subscription.category, 
                  value as 'realtime' | 'hourly' | 'daily' | 'weekly'
                )}
                disabled={!subscription.enabled}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
