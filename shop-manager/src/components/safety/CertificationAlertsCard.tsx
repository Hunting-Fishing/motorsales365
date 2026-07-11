import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useNavigate } from 'react-router-dom';

interface CertificateAlert {
  id: string;
  staff_name: string;
  certificate_name: string;
  expiry_date: string;
  days_until_expiry: number;
}

export function CertificationAlertsCard() {
  const { shopId } = useShopId();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<CertificateAlert[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchCertificationAlerts();
    }
  }, [shopId]);

  const fetchCertificationAlerts = async () => {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from('staff_certificates')
        .select(`
          id,
          expiry_date,
          staff_id,
          certificate_type_id,
          profiles:staff_id (first_name, last_name),
          staff_certificate_types:certificate_type_id (name)
        `)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })
        .limit(10);

      if (error) throw error;

      const formattedAlerts: CertificateAlert[] = (data || []).map((cert: any) => ({
        id: cert.id,
        staff_name: cert.profiles ? `${cert.profiles.first_name || ''} ${cert.profiles.last_name || ''}`.trim() : 'Unknown',
        certificate_name: cert.staff_certificate_types?.name || 'Unknown Certificate',
        expiry_date: cert.expiry_date,
        days_until_expiry: differenceInDays(new Date(cert.expiry_date), today)
      }));

      setAlerts(formattedAlerts);
    } catch (error) {
      console.error('Error fetching certification alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certification Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          Certification Alerts
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/safety/certifications')}
        >
          View All
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <div className="p-4 rounded-full bg-green-500/10 w-fit mx-auto mb-3">
              <Award className="h-8 w-8 text-green-500" />
            </div>
            <p className="font-medium text-green-600">All Certifications Current</p>
            <p className="text-sm text-muted-foreground">No expiring certificates in the next 30 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const isExpired = alert.days_until_expiry < 0;
              const isUrgent = alert.days_until_expiry <= 7 && alert.days_until_expiry >= 0;
              
              return (
                <div 
                  key={alert.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isExpired ? 'bg-destructive/5 border-destructive/20' : 
                    isUrgent ? 'bg-amber-500/5 border-amber-500/20' : 
                    'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      isExpired ? 'bg-destructive/10' : 
                      isUrgent ? 'bg-amber-500/10' : 
                      'bg-muted'
                    }`}>
                      {isExpired ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{alert.staff_name}</p>
                      <p className="text-sm text-muted-foreground">{alert.certificate_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={isExpired ? 'destructive' : 'outline'}
                      className={isUrgent && !isExpired ? 'bg-amber-500/10 text-amber-600 border-amber-200' : ''}
                    >
                      {isExpired ? 'EXPIRED' : `${alert.days_until_expiry} days`}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(alert.expiry_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
