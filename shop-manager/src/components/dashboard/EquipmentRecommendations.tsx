
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEquipmentRecommendations } from "@/services/dashboard"; // Updated import path
import { EquipmentRecommendation } from "@/types/dashboard";
import { Loader2, AlertCircle, Calendar, Wrench } from "lucide-react";

export function EquipmentRecommendations() {
  const [recommendations, setRecommendations] = useState<EquipmentRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const data = await getEquipmentRecommendations();
        setRecommendations(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching equipment recommendations:", err);
        setError("Failed to load equipment recommendations");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'High': return 'text-red-500';
      case 'Medium': return 'text-amber-500';
      case 'Low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Equipment Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Equipment Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-48 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Maintenance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No maintenance recommendations
            </div>
          ) : (
            recommendations.map((recommendation) => (
              <div key={recommendation.id} className="flex items-start space-x-3 border-b pb-3 last:border-0">
                <Wrench className="h-5 w-5 mt-1 text-slate-500" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-medium">{recommendation.name} ({recommendation.model})</p>
                    <p className={`text-sm font-medium ${getPriorityColor(recommendation.priority)}`}>
                      {recommendation.priority}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.manufacturer} - {recommendation.status}
                  </p>
                  <div className="flex items-center mt-1 text-sm">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    <span>
                      {recommendation.maintenanceType} - {recommendation.maintenanceDate}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
