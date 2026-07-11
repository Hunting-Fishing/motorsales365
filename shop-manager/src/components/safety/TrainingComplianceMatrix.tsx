import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { CheckCircle, XCircle, AlertTriangle, Download, Users } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { TRAINING_TYPE_LABELS, TrainingType } from '@/types/safety';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface TrainingRecord {
  staff_id: string;
  training_type: string;
  acknowledged_at: string;
  expiry_date: string | null;
}

interface ComplianceStatus {
  completed: boolean;
  expired: boolean;
  expiringSoon: boolean;
  acknowledgedAt?: string;
  expiryDate?: string;
}

const REQUIRED_TRAININGS: TrainingType[] = [
  'hazard_communication',
  'ppe',
  'fire_safety',
  'emergency_procedures',
  'lockout_tagout',
  'whmis',
  'equipment_operation',
  'forklift',
  'first_aid',
  'confined_space'
];

export function TrainingComplianceMatrix() {
  const { shopId } = useShopId();
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchData();
    }
  }, [shopId]);

  const fetchData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      // Fetch staff members
      const { data: staffData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('shop_id', shopId)
        .order('first_name');

      // Fetch training acknowledgments
      const { data: trainingData } = await supabase
        .from('safety_training_acknowledgments')
        .select('staff_id, training_type, acknowledged_at, expiry_date')
        .eq('shop_id', shopId);

      setStaffMembers(staffData || []);
      setTrainingRecords((trainingData || []) as TrainingRecord[]);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceStatus = (staffId: string, trainingType: string): ComplianceStatus => {
    const record = trainingRecords.find(
      r => r.staff_id === staffId && r.training_type === trainingType
    );

    if (!record) {
      return { completed: false, expired: false, expiringSoon: false };
    }

    const today = new Date();
    const isExpired = record.expiry_date ? new Date(record.expiry_date) < today : false;
    const daysUntilExpiry = record.expiry_date 
      ? differenceInDays(new Date(record.expiry_date), today) 
      : null;
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

    return {
      completed: true,
      expired: isExpired,
      expiringSoon: isExpiringSoon,
      acknowledgedAt: record.acknowledged_at,
      expiryDate: record.expiry_date || undefined
    };
  };

  const getStaffComplianceRate = (staffId: string): number => {
    const completed = REQUIRED_TRAININGS.filter(
      type => {
        const status = getComplianceStatus(staffId, type);
        return status.completed && !status.expired;
      }
    ).length;
    return Math.round((completed / REQUIRED_TRAININGS.length) * 100);
  };

  const getOverallComplianceRate = (): number => {
    if (staffMembers.length === 0) return 0;
    const totalRequired = staffMembers.length * REQUIRED_TRAININGS.length;
    let completed = 0;
    
    staffMembers.forEach(staff => {
      REQUIRED_TRAININGS.forEach(type => {
        const status = getComplianceStatus(staff.id, type);
        if (status.completed && !status.expired) {
          completed++;
        }
      });
    });

    return Math.round((completed / totalRequired) * 100);
  };

  const getExpiringCount = (): number => {
    let count = 0;
    staffMembers.forEach(staff => {
      REQUIRED_TRAININGS.forEach(type => {
        const status = getComplianceStatus(staff.id, type);
        if (status.expiringSoon) {
          count++;
        }
      });
    });
    return count;
  };

  const getMissingCount = (): number => {
    let count = 0;
    staffMembers.forEach(staff => {
      REQUIRED_TRAININGS.forEach(type => {
        const status = getComplianceStatus(staff.id, type);
        if (!status.completed || status.expired) {
          count++;
        }
      });
    });
    return count;
  };

  const exportComplianceReport = () => {
    const rows = [['Staff Name', ...REQUIRED_TRAININGS.map(t => TRAINING_TYPE_LABELS[t]), 'Compliance Rate']];
    
    staffMembers.forEach(staff => {
      const row = [
        `${staff.first_name} ${staff.last_name}`,
        ...REQUIRED_TRAININGS.map(type => {
          const status = getComplianceStatus(staff.id, type);
          if (!status.completed) return 'Missing';
          if (status.expired) return 'Expired';
          if (status.expiringSoon) return 'Expiring Soon';
          return 'Completed';
        }),
        `${getStaffComplianceRate(staff.id)}%`
      ];
      rows.push(row);
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-compliance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const overallRate = getOverallComplianceRate();
  const expiringCount = getExpiringCount();
  const missingCount = getMissingCount();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Training Compliance Matrix
            </CardTitle>
            <CardDescription>
              Staff training completion status for required safety trainings
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportComplianceReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${overallRate >= 80 ? 'bg-green-50 dark:bg-green-900/20' : overallRate >= 50 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <p className="text-sm text-muted-foreground">Overall Compliance</p>
            <p className={`text-2xl font-bold ${overallRate >= 80 ? 'text-green-600' : overallRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {overallRate}%
            </p>
          </div>
          <div className={`p-4 rounded-lg ${expiringCount > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-muted'}`}>
            <p className="text-sm text-muted-foreground">Expiring Soon</p>
            <p className={`text-2xl font-bold ${expiringCount > 0 ? 'text-yellow-600' : ''}`}>
              {expiringCount}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${missingCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
            <p className="text-sm text-muted-foreground">Missing/Expired</p>
            <p className={`text-2xl font-bold ${missingCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {missingCount}
            </p>
          </div>
        </div>

        {/* Compliance Matrix Table */}
        {staffMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No staff members found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Staff Member</th>
                  {REQUIRED_TRAININGS.map(type => (
                    <th key={type} className="text-center py-2 px-2 font-medium text-xs">
                      {TRAINING_TYPE_LABELS[type].split(' ')[0]}
                    </th>
                  ))}
                  <th className="text-center py-2 px-3 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {staffMembers.map(staff => {
                  const complianceRate = getStaffComplianceRate(staff.id);
                  return (
                    <tr key={staff.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-3">
                        {staff.first_name} {staff.last_name}
                      </td>
                      {REQUIRED_TRAININGS.map(type => {
                        const status = getComplianceStatus(staff.id, type);
                        return (
                          <td key={type} className="py-3 px-2 text-center">
                            {status.completed && !status.expired && !status.expiringSoon && (
                              <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                            )}
                            {status.expiringSoon && (
                              <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto" />
                            )}
                            {status.expired && (
                              <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                            )}
                            {!status.completed && (
                              <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 text-center">
                        <Badge 
                          variant={complianceRate >= 80 ? 'default' : complianceRate >= 50 ? 'secondary' : 'destructive'}
                        >
                          {complianceRate}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-6 text-xs text-muted-foreground pt-4 border-t">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Completed
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Expiring Soon (30 days)
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-500" />
            Expired/Missing
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
