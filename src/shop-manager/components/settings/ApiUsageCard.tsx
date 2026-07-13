import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiUsage } from "@/hooks/useApiUsage";
import { Bot, MessageSquare, Phone, Mail, TrendingUp, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiUsageCardProps {
  shopId?: string;
  tierSlug?: string;
  onUpgrade?: () => void;
}

export const ApiUsageCard = ({ shopId, tierSlug, onUpgrade }: ApiUsageCardProps) => {
  const { data, isLoading, error } = useApiUsage(shopId, tierSlug);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const { usage, limits, percentages } = data;

  const usageItems = [
    {
      icon: Bot,
      label: "AI Calls",
      used: usage.openai_calls,
      limit: limits.openai_calls_limit,
      percentage: percentages.openai,
      color: "text-purple-500",
    },
    {
      icon: MessageSquare,
      label: "SMS Messages",
      used: usage.sms_count,
      limit: limits.sms_limit,
      percentage: percentages.sms,
      color: "text-blue-500",
    },
    {
      icon: Phone,
      label: "Voice Minutes",
      used: usage.voice_minutes,
      limit: limits.voice_minutes_limit,
      percentage: percentages.voice,
      color: "text-green-500",
    },
    {
      icon: Mail,
      label: "Emails",
      used: usage.emails_sent,
      limit: limits.email_limit,
      percentage: percentages.email,
      color: "text-orange-500",
    },
  ];

  const hasHighUsage = Object.values(percentages).some((p) => p >= 80);
  const hasExceeded = Object.values(percentages).some((p) => p >= 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">API Usage</CardTitle>
          </div>
          <Badge variant={hasExceeded ? "destructive" : hasHighUsage ? "secondary" : "outline"}>
            {limits.tier_name}
          </Badge>
        </div>
        <CardDescription>Current billing period usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usageItems.map((item) => {
          const isUnlimited = item.limit >= 999999;
          const isWarning = item.percentage >= 80 && item.percentage < 100;
          const isExceeded = item.percentage >= 100;

          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className="font-medium">{item.label}</span>
                  {isWarning && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                  {isExceeded && <AlertTriangle className="h-3 w-3 text-destructive" />}
                </div>
                <span className="text-muted-foreground">
                  {item.used.toLocaleString()} / {isUnlimited ? "∞" : item.limit.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={isUnlimited ? 0 : Math.min(item.percentage, 100)} 
                className={`h-2 ${isExceeded ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-yellow-500" : ""}`}
              />
            </div>
          );
        })}

        {(hasHighUsage || hasExceeded) && onUpgrade && (
          <div className="pt-2">
            <Button 
              variant={hasExceeded ? "default" : "outline"} 
              size="sm" 
              className="w-full"
              onClick={onUpgrade}
            >
              {hasExceeded ? "Upgrade Now" : "Upgrade for More"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
