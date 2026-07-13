
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Bell } from "lucide-react";
import { motion } from "framer-motion";

interface ConnectionStatusCardProps {
  connectionStatus: boolean;
  onTestNotification: () => void;
}

export function ConnectionStatusCard({ 
  connectionStatus, 
  onTestNotification 
}: ConnectionStatusCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-card to-muted/50">
        <div className="space-y-1">
          <CardTitle className="text-lg">Notification System Status</CardTitle>
        </div>
        <motion.div
          animate={{ 
            scale: connectionStatus ? [1, 1.2, 1] : 1, 
            opacity: connectionStatus ? 1 : 0.7 
          }}
          transition={{ duration: 1, repeat: connectionStatus ? Infinity : 0, repeatDelay: 4 }}
        >
          {connectionStatus ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-destructive" />
          )}
        </motion.div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">
              {connectionStatus
                ? "You are connected to the notification system"
                : "You are disconnected from the notification system"}
            </p>
            <p className={`text-sm mt-1 font-medium ${connectionStatus ? "text-green-600" : "text-destructive"}`}>
              {connectionStatus ? "Active" : "Inactive"}
            </p>
          </div>
          <Button 
            onClick={onTestNotification}
            disabled={!connectionStatus}
            size="sm"
            variant="outline"
            className="hover:bg-secondary"
          >
            <Bell className="mr-2 h-4 w-4" />
            Test Notification
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
