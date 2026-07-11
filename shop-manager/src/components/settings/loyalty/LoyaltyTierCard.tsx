
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoyaltyTier } from "@/types/loyalty";
import { Award, Edit2, Trash2 } from "lucide-react";

interface LoyaltyTierCardProps {
  tier: LoyaltyTier;
  onEdit: () => void;
  onDelete: () => void;
}

export function LoyaltyTierCard({ tier, onEdit, onDelete }: LoyaltyTierCardProps) {
  // Generate background color class based on tier color
  const getBgColor = () => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-100',
      blue: 'bg-blue-100',
      purple: 'bg-purple-100',
      amber: 'bg-amber-100',
      red: 'bg-red-100',
      teal: 'bg-teal-100'
    };
    
    return colorMap[tier.color || 'blue'] || 'bg-gray-100';
  };
  
  // Generate badge color class based on tier color
  const getBadgeColor = () => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-500 hover:bg-green-600',
      blue: 'bg-blue-500 hover:bg-blue-600',
      purple: 'bg-purple-500 hover:bg-purple-600',
      amber: 'bg-amber-500 hover:bg-amber-600',
      red: 'bg-red-500 hover:bg-red-600',
      teal: 'bg-teal-500 hover:bg-teal-600'
    };
    
    return colorMap[tier.color || 'blue'] || 'bg-gray-500 hover:bg-gray-600';
  };

  return (
    <Card className={`${getBgColor()} border-l-4`} style={{ borderLeftColor: tier.color || 'blue' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Award className="h-8 w-8" color={tier.color || 'blue'} />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-lg">{tier.name}</h3>
                <Badge className={getBadgeColor()}>
                  {tier.multiplier && tier.multiplier > 1
                    ? `${((tier.multiplier - 1) * 100).toFixed(0)}% Bonus`
                    : 'Standard'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  {tier.threshold.toLocaleString()} points
                </p>
                {tier.benefits && (
                  <p className="text-sm text-muted-foreground truncate max-w-md">
                    • {tier.benefits}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
