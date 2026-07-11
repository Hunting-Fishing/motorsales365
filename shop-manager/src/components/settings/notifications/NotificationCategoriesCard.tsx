
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { NotificationPreferences } from "@/types/notification";
import { Bell } from "lucide-react";
import { capitalize } from "@/utils/stringUtils";

interface NotificationCategoriesCardProps {
  preferences: NotificationPreferences;
  onSubscriptionToggle: (category: string) => void;
}

export function NotificationCategoriesCard({ 
  preferences, 
  onSubscriptionToggle 
}: NotificationCategoriesCardProps) {
  // Function to get icon based on category
  const getCategoryIcon = (category: string) => {
    // This would typically return a specific icon for each category
    // For now, we'll just return Bell for all
    return <Bell className="h-4 w-4" />;
  };

  // Function to format category name for display
  const formatCategoryName = (category: string): string => {
    if (category === 'workOrder') return 'Work Order';
    return capitalize(category);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>
            Choose which notification types you want to receive
          </CardDescription>
        </div>
        <Bell className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {preferences.subscriptions.map((subscription) => (
            <div 
              key={subscription.category} 
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="text-muted-foreground">
                  {getCategoryIcon(subscription.category)}
                </div>
                <div>
                  <p className="font-medium">{formatCategoryName(subscription.category)} Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Updates related to {subscription.category === 'workOrder' ? 'work orders' : subscription.category}
                  </p>
                </div>
              </div>
              <Switch 
                checked={subscription.enabled} 
                onCheckedChange={() => onSubscriptionToggle(subscription.category)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
