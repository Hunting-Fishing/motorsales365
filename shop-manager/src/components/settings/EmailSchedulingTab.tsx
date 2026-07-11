
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { schedulingService } from "@/services/email/schedulingService";
import { ManageSequenceProcessingButton } from "@/components/email/sequence/ManageSequenceProcessingButton";

export function EmailSchedulingTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [cronExpression, setCronExpression] = useState("0 * * * *"); // Default: Every hour
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadScheduleSettings();
  }, []);

  const loadScheduleSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await schedulingService.getSequenceProcessingSchedule();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setEnabled(data.enabled);
        setCronExpression(data.cron || "0 * * * *");
      }
    } catch (error) {
      console.error("Error loading schedule settings:", error);
      toast({
        title: "Error",
        description: "Failed to load email processing settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await schedulingService.updateSequenceProcessingSchedule({
        enabled,
        cron: cronExpression,
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Settings saved",
        description: "Email processing schedule settings have been updated",
      });
    } catch (error) {
      console.error("Error saving schedule settings:", error);
      toast({
        title: "Error",
        description: "Failed to save email processing settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderCronHelper = () => (
    <div className="text-xs text-muted-foreground mt-1">
      <p>Cron syntax: minute hour day-of-month month day-of-week</p>
      <p>Examples:</p>
      <ul className="list-disc list-inside pl-2 mt-1">
        <li>0 * * * * - Every hour</li>
        <li>0 */2 * * * - Every 2 hours</li>
        <li>0 0 * * * - Daily at midnight</li>
        <li>0 9 * * 1-5 - Weekdays at 9:00 AM</li>
      </ul>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Sequence Processing</CardTitle>
          <CardDescription>
            Configure when and how email sequences are processed automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin"></div>
              <span>Loading settings...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="scheduling-enabled">Automated Processing</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable scheduled processing of email sequences
                  </p>
                </div>
                <Switch 
                  id="scheduling-enabled" 
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="cron-expression">Schedule (Cron Expression)</Label>
                <Input 
                  id="cron-expression" 
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  disabled={!enabled}
                />
                {renderCronHelper()}
              </div>
              
              <div className="pt-4 flex justify-between">
                <ManageSequenceProcessingButton />
                <Button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
