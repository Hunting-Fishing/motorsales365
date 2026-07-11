
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { AlertTriangle, Settings, ShieldCheck, CheckCircle, ArrowRight } from "lucide-react";
import { EquipmentRecommendation, getRecommendationTypeColor } from "@/utils/equipment/recommendations";
import { Button } from "@/components/ui/button";

interface EquipmentRecommendationsCardProps {
  recommendations: EquipmentRecommendation[];
  className?: string;
}

export function EquipmentRecommendationsCard({ recommendations, className = "" }: EquipmentRecommendationsCardProps) {
  const [viewAll, setViewAll] = useState(false);
  
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'soon':
        return <Settings className="h-4 w-4 text-amber-500" />;
      case 'normal':
        return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const displayedRecommendations = viewAll ? recommendations : recommendations.slice(0, 5);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Equipment Recommendations</span>
          <span className="text-xs font-normal bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
            {recommendations.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-6">
            <ShieldCheck className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recommendations at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedRecommendations.map((recommendation) => (
              <div 
                key={recommendation.id} 
                className={`p-3 border rounded-md ${getRecommendationTypeColor(recommendation.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getRecommendationIcon(recommendation.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">
                      {recommendation.equipmentName}
                    </h4>
                    <p className="text-xs mt-1">{recommendation.reason}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-medium">
                        {recommendation.action}
                      </span>
                      <Link 
                        to={`/equipment/${recommendation.equipmentId}`}
                        className="flex items-center gap-1 text-xs font-medium hover:underline"
                      >
                        View details
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {recommendations.length > 5 && (
              <div className="text-center pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewAll(!viewAll)}
                >
                  {viewAll ? "Show Less" : `View ${recommendations.length - 5} More`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
