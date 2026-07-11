
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { NotificationPreferences } from "@/types/notification";
import { MessageSquare, Mail, BellRing } from "lucide-react";

interface NotificationChannelsCardProps {
  preferences: NotificationPreferences;
  onChannelToggle: (channel: keyof Pick<NotificationPreferences, 'email' | 'push' | 'inApp'>) => void;
}

export function NotificationChannelsCard({ 
  preferences, 
  onChannelToggle 
}: NotificationChannelsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </div>
        <BellRing className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">In-App Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Notifications appear in the app
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={preferences.inApp ? "default" : "outline"}>
                {preferences.inApp ? "On" : "Off"}
              </Badge>
              <Switch 
                checked={preferences.inApp} 
                onCheckedChange={() => onChannelToggle("inApp")}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={preferences.email ? "default" : "outline"}>
                {preferences.email ? "On" : "Off"}
              </Badge>
              <Switch 
                checked={preferences.email} 
                onCheckedChange={() => onChannelToggle("email")}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BellRing className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on your device
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={preferences.push ? "default" : "outline"}>
                {preferences.push ? "On" : "Off"}
              </Badge>
              <Switch 
                checked={preferences.push} 
                onCheckedChange={() => onChannelToggle("push")}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
