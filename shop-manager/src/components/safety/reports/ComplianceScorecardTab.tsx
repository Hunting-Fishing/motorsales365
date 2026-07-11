import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, CheckCircle, AlertTriangle, XCircle, TrendingUp, Award } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { ComplianceScore } from '@/hooks/useSafetyReports';

interface Props {
  score: ComplianceScore | null;
  loading: boolean;
}

export function ComplianceScorecardTab({ score, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const overall = score?.overall || 0;

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-600';
    if (s >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (s: number) => {
    if (s >= 90) return { label: 'Excellent', variant: 'default' as const, className: 'bg-green-500' };
    if (s >= 80) return { label: 'Good', variant: 'default' as const, className: 'bg-blue-500' };
    if (s >= 70) return { label: 'Fair', variant: 'default' as const, className: 'bg-yellow-500' };
    if (s >= 60) return { label: 'Needs Improvement', variant: 'default' as const, className: 'bg-orange-500' };
    return { label: 'Critical', variant: 'destructive' as const, className: '' };
  };

  const badge = getScoreBadge(overall);

  const radarData = [
    { subject: 'Incidents', score: score?.incidents || 0, fullMark: 100 },
    { subject: 'Inspections', score: score?.inspections || 0, fullMark: 100 },
    { subject: 'Certifications', score: score?.certifications || 0, fullMark: 100 },
    { subject: 'Training', score: score?.training || 0, fullMark: 100 },
  ];

  const categories = [
    { name: 'Incident Management', score: score?.incidents || 0, icon: AlertTriangle, description: 'Based on incident frequency and severity' },
    { name: 'Inspection Compliance', score: score?.inspections || 0, icon: CheckCircle, description: 'Based on inspection pass rates' },
    { name: 'Certification Status', score: score?.certifications || 0, icon: Award, description: 'Based on valid certification percentage' },
    { name: 'Training Completion', score: score?.training || 0, icon: TrendingUp, description: 'Based on training assignment completion' },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Overall Compliance Score
          </CardTitle>
          <CardDescription>
            Composite safety and compliance rating
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-center">
              <div className={`text-7xl font-bold ${getScoreColor(overall)}`}>
                {overall}
              </div>
              <div className="text-lg text-muted-foreground">out of 100</div>
              <Badge className={`mt-2 ${badge.className}`} variant={badge.variant}>
                {badge.label}
              </Badge>
            </div>
            
            <div className="flex-1 h-64 w-full md:w-auto">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.5}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown by Category</CardTitle>
          <CardDescription>Detailed compliance metrics for each area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categories.map((category, idx) => {
              const Icon = category.icon;
              const catScore = category.score;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${catScore >= 80 ? 'bg-green-500/10' : catScore >= 60 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                        <Icon className={`h-5 w-5 ${catScore >= 80 ? 'text-green-500' : catScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${getScoreColor(catScore)}`}>{catScore}%</span>
                    </div>
                  </div>
                  <Progress value={catScore} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Improvement Recommendations</CardTitle>
          <CardDescription>Actions to improve your compliance score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(score?.incidents || 0) < 90 && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium">Reduce Incident Rate</p>
                  <p className="text-sm text-muted-foreground">
                    Implement additional safety training and hazard identification programs to reduce workplace incidents.
                  </p>
                </div>
              </div>
            )}
            {(score?.inspections || 0) < 90 && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Improve Inspection Pass Rate</p>
                  <p className="text-sm text-muted-foreground">
                    Review common inspection failures and address recurring issues proactively.
                  </p>
                </div>
              </div>
            )}
            {(score?.certifications || 0) < 100 && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Award className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Update Certifications</p>
                  <p className="text-sm text-muted-foreground">
                    Ensure all staff certifications are renewed before expiration. Set up automated reminders.
                  </p>
                </div>
              </div>
            )}
            {(score?.training || 0) < 100 && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Complete Training Assignments</p>
                  <p className="text-sm text-muted-foreground">
                    Follow up on overdue training assignments and ensure all staff complete required courses.
                  </p>
                </div>
              </div>
            )}
            {overall >= 90 && (
              <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700">Excellent Compliance!</p>
                  <p className="text-sm text-green-600">
                    Your safety compliance is excellent. Continue maintaining current practices and stay vigilant.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
