
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationPreviewProps {}

export function NotificationPreviewCard({}: NotificationPreviewProps) {
  const demoNotifications = [
    {
      type: "info",
      title: "Information Notification",
      message: "This is a sample informational notification.",
    },
    {
      type: "success",
      title: "Success Notification",
      message: "This is a sample success notification.",
    },
    {
      type: "warning",
      title: "Warning Notification",
      message: "This is a sample warning notification.",
    },
    {
      type: "error",
      title: "Error Notification",
      message: "This is a sample error notification.",
    },
  ];

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "info":
        return "bg-blue-50 border-blue-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case "info":
        return "text-blue-800";
      case "success":
        return "text-green-800";
      case "warning":
        return "text-yellow-800";
      case "error":
        return "text-red-800";
      default:
        return "text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Notification Preview</CardTitle>
        </div>
        <Eye className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          Preview how different types of notifications will appear
        </div>
        <div className="space-y-3">
          {demoNotifications.map((notification, index) => (
            <div
              key={index}
              className={`border p-3 rounded-md ${getBackgroundColor(notification.type)}`}
            >
              <div className={`font-medium mb-1 ${getTextColor(notification.type)}`}>
                {notification.title}
              </div>
              <div className="text-sm text-gray-600">{notification.message}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
