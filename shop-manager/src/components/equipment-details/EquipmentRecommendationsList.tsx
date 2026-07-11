
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, AlertTriangle, Settings, ShieldCheck, CheckCircle } from "lucide-react";
import { EquipmentRecommendation, getRecommendationTypeColor } from "@/utils/equipment/recommendations";

interface EquipmentRecommendationsListProps {
  recommendations: EquipmentRecommendation[];
}

export const EquipmentRecommendationsList: React.FC<EquipmentRecommendationsListProps> = ({ 
  recommendations 
}) => {
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No recommendations at this time</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'soon':
        return <Settings className="h-5 w-5 text-amber-500" />;
      case 'normal':
        return <ShieldCheck className="h-5 w-5 text-blue-500" />;
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((recommendation) => (
            <div 
              key={recommendation.id} 
              className={`p-4 border rounded-md ${getRecommendationTypeColor(recommendation.type)}`}
            >
              <div className="flex gap-4">
                <div className="mt-0.5">
                  {getRecommendationIcon(recommendation.type)}
                </div>
                <div>
                  <h4 className="font-medium mb-1">
                    {recommendation.action}
                  </h4>
                  <p className="text-sm">{recommendation.reason}</p>
                  {recommendation.dueDate && (
                    <p className="mt-2 text-sm font-medium">
                      Due: {recommendation.dueDate}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
