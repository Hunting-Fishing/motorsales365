import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Users, Calendar, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RiskCustomer {
  id: string;
  name: string;
  email: string;
  lastService: string;
  riskScore: number;
  riskFactors: string[];
  recommendedAction: string;
}

interface CustomerRetentionRiskCardProps {
  customers: RiskCustomer[];
  isLoading?: boolean;
}

export function CustomerRetentionRiskCard({ customers, isLoading = false }: CustomerRetentionRiskCardProps) {
  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: 'High', color: 'destructive' };
    if (score >= 60) return { label: 'Medium', color: 'warning' };
    return { label: 'Low', color: 'secondary' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Customer Retention Risk
          </CardTitle>
          <CardDescription>Customers at risk of churning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const highRiskCount = customers.filter(c => c.riskScore >= 80).length;
  const mediumRiskCount = customers.filter(c => c.riskScore >= 60 && c.riskScore < 80).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Customer Retention Risk
        </CardTitle>
        <CardDescription>
          {highRiskCount} high risk, {mediumRiskCount} medium risk customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {customers.slice(0, 5).map((customer) => {
            const risk = getRiskLevel(customer.riskScore);
            
            return (
              <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{customer.name}</span>
                    <Badge variant={risk.color as any}>{risk.label} Risk</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Last service: {customer.lastService}
                    </div>
                    <span>Score: {customer.riskScore}%</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Risk factors:</span>{' '}
                    {customer.riskFactors.slice(0, 2).join(', ')}
                    {customer.riskFactors.length > 2 && ` +${customer.riskFactors.length - 2} more`}
                  </div>
                  <div className="text-sm text-primary mt-1">
                    <span className="font-medium">Recommended:</span> {customer.recommendedAction}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button size="sm">Contact</Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">Retention Strategy</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Proactive outreach to high-risk customers</li>
            <li>• Personalized service offers based on history</li>
            <li>• Regular check-ins for medium-risk segments</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}