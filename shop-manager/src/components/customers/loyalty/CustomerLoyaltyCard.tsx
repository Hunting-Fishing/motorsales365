
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CustomerLoyalty } from '@/types/loyalty';

interface CustomerLoyaltyCardProps {
  customerLoyalty?: CustomerLoyalty | null;
  isLoading: boolean;
  onAddPoints?: () => void;
  onViewHistory?: () => void;
}

export function CustomerLoyaltyCard({ 
  customerLoyalty, 
  isLoading, 
  onAddPoints, 
  onViewHistory 
}: CustomerLoyaltyCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const handleAddPoints = () => {
    toast({
      title: "Points Added",
      description: "Successfully added points to customer's loyalty account.",
    });
    if (onAddPoints) onAddPoints();
  };

  const handleViewHistory = () => {
    setShowHistory(true);
    if (onViewHistory) onViewHistory();
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
  };

  // Calculate progress to next tier
  const getProgressToNextTier = () => {
    if (!customerLoyalty) return { progress: 0, pointsNeeded: 0, nextTier: 'Silver' };
    
    const currentPoints = customerLoyalty.lifetime_points || 0;
    let nextTierThreshold = 1000;
    let nextTierName = 'Silver';
    
    if (currentPoints < 1000) {
      nextTierThreshold = 1000;
      nextTierName = 'Silver';
    } else if (currentPoints < 5000) {
      nextTierThreshold = 5000;
      nextTierName = 'Gold';
    } else if (currentPoints < 10000) {
      nextTierThreshold = 10000;
      nextTierName = 'Platinum';
    } else {
      return { progress: 100, pointsNeeded: 0, nextTier: 'Platinum (Max)' };
    }
    
    const progress = (currentPoints / nextTierThreshold) * 100;
    const pointsNeeded = nextTierThreshold - currentPoints;
    
    return { progress, pointsNeeded, nextTier: nextTierName };
  };

  const { progress, pointsNeeded, nextTier } = getProgressToNextTier();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Program</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use actual data if available, otherwise show default values
  const currentPoints = customerLoyalty?.current_points ?? 0;
  const lifetimePoints = customerLoyalty?.lifetime_points ?? 0;
  const tier = customerLoyalty?.tier ?? 'Bronze';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Loyalty Program</CardTitle>
          <Badge className="bg-blue-500 text-white capitalize">
            {tier} Tier
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold">{currentPoints.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Current Points</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{lifetimePoints.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Lifetime Points</p>
            </div>
            <div>
              <div className="flex items-center">
                <Award className="h-5 w-5 mr-1 text-amber-500" />
                <span className="text-lg font-medium capitalize">{tier}</span>
              </div>
              <p className="text-sm text-muted-foreground">Loyalty Tier</p>
            </div>
          </div>
          
          {pointsNeeded > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to {nextTier}</span>
                <span>{pointsNeeded.toLocaleString()} points needed</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
          
          <div className="flex space-x-2 pt-2">
            <Button variant="outline" onClick={handleAddPoints} className="flex-1">
              Add Points
            </Button>
            <Button variant="outline" onClick={handleViewHistory} className="flex-1">
              View History
            </Button>
          </div>
        </div>
      </CardContent>
      
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loyalty Points History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Loyalty history tracking will be available in a future update.
            </p>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Current Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current Points:</span>
                  <span>{currentPoints.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lifetime Points:</span>
                  <span>{lifetimePoints.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Tier:</span>
                  <span className="capitalize">{tier}</span>
                </div>
              </div>
            </div>
          </div>
          <Button onClick={handleCloseHistory}>Close</Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
