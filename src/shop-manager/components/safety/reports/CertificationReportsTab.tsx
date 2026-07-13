import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props { metrics: any; loading: boolean; }

export function CertificationReportsTab({ metrics, loading }: Props) {
  if (loading) return <Card><CardContent className="py-12 text-center">Loading...</CardContent></Card>;
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Certification Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-2xl font-bold">{metrics?.totalCertifications || 0}</p><p className="text-sm text-muted-foreground">Total</p></div>
            <div><p className="text-2xl font-bold text-green-600">{metrics?.validCount || 0}</p><p className="text-sm text-muted-foreground">Valid</p></div>
            <div><p className="text-2xl font-bold text-orange-600">{metrics?.expiringSoon || 0}</p><p className="text-sm text-muted-foreground">Expiring Soon</p></div>
            <div><p className="text-2xl font-bold text-red-600">{metrics?.expired || 0}</p><p className="text-sm text-muted-foreground">Expired</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
