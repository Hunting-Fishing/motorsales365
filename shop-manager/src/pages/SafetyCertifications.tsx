import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useSafetyCertifications } from '@/hooks/useSafetyCertifications';
import { AddCertificateDialog } from '@/components/safety/AddCertificateDialog';
import { TrainingAcknowledgmentsCard } from '@/components/safety/TrainingAcknowledgmentsCard';
import { TrainingComplianceMatrix } from '@/components/safety/TrainingComplianceMatrix';
import { TrainingAcknowledgmentDialog } from '@/components/safety/TrainingAcknowledgmentDialog';
import { 
  Award, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Search,
  User,
  Calendar,
  RefreshCw,
  GraduationCap,
  LayoutGrid,
  ClipboardCheck
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';

export default function SafetyCertifications() {
  const { shopId } = useShopId();
  const { 
    loading, 
    certificates, 
    certificateTypes,
    getExpiredCertificates, 
    getExpiringCertificates, 
    getValidCertificates,
    refetch 
  } = useSafetyCertifications();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'by-staff' | 'compliance'>('list');

  const expired = getExpiredCertificates();
  const expiring = getExpiringCertificates(30);
  const valid = getValidCertificates();

  // Fetch staff list for the add dialog
  useEffect(() => {
    const fetchStaff = async () => {
      if (!shopId) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('shop_id', shopId);
      
      if (data) {
        setStaffOptions(data.map(p => ({
          id: p.id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'
        })));
      }
    };
    fetchStaff();
  }, [shopId]);

  // Filter certificates by search
  const filterCertificates = (certs: typeof certificates) => {
    if (!searchQuery) return certs;
    const query = searchQuery.toLowerCase();
    return certs.filter(cert => 
      cert.certificate_type?.name?.toLowerCase().includes(query) ||
      cert.staff?.first_name?.toLowerCase().includes(query) ||
      cert.staff?.last_name?.toLowerCase().includes(query) ||
      cert.certificate_number?.toLowerCase().includes(query)
    );
  };

  // Group certificates by staff
  const groupByStaff = (certs: typeof certificates) => {
    const grouped: Record<string, typeof certificates> = {};
    certs.forEach(cert => {
      const staffName = cert.staff 
        ? `${cert.staff.first_name || ''} ${cert.staff.last_name || ''}`.trim() 
        : 'Unknown';
      if (!grouped[staffName]) grouped[staffName] = [];
      grouped[staffName].push(cert);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const filteredAll = filterCertificates(certificates);
  const filteredExpired = filterCertificates(expired);
  const filteredExpiring = filterCertificates(expiring);

  return (
    <>
      <Helmet>
        <title>Safety Certifications | Safety</title>
        <meta name="description" content="Manage staff safety certifications and training records" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Award className="h-8 w-8 text-primary" />
              Safety Certifications
            </h1>
            <p className="text-muted-foreground mt-1">Staff certifications and training records</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => setTrainingDialogOpen(true)}>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Record Training
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Certificate
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={expired.length > 0 ? 'border-red-300' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${expired.length > 0 ? 'text-red-600' : ''}`}>
                {expired.length}
              </p>
              <p className="text-xs text-muted-foreground">Require immediate renewal</p>
            </CardContent>
          </Card>
          
          <Card className={expiring.length > 0 ? 'border-yellow-300' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${expiring.length > 0 ? 'text-yellow-600' : ''}`}>
                {expiring.length}
              </p>
              <p className="text-xs text-muted-foreground">Within next 30 days</p>
            </CardContent>
          </Card>
          
          <Card className="border-green-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Valid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{valid.length}</p>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, certificate type, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button 
              variant={viewMode === 'by-staff' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('by-staff')}
            >
              <User className="h-4 w-4 mr-2" />
              By Staff
            </Button>
            <Button 
              variant={viewMode === 'compliance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('compliance')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Compliance Matrix
            </Button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({filteredAll.length})</TabsTrigger>
              <TabsTrigger value="expired" className="text-red-600">
                Expired ({filteredExpired.length})
              </TabsTrigger>
              <TabsTrigger value="expiring" className="text-yellow-600">
                Expiring ({filteredExpiring.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {filteredAll.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Certificates Found</p>
                    <p className="text-muted-foreground">Add certificates to track staff qualifications</p>
                    <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Certificate
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredAll.map((cert) => (
                  <CertificateCard key={cert.id} certificate={cert} />
                ))
              )}
            </TabsContent>

            <TabsContent value="expired" className="space-y-3 mt-4">
              {filteredExpired.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-2" />
                    <p className="font-medium">No Expired Certificates</p>
                  </CardContent>
                </Card>
              ) : (
                filteredExpired.map((cert) => (
                  <CertificateCard key={cert.id} certificate={cert} />
                ))
              )}
            </TabsContent>

            <TabsContent value="expiring" className="space-y-3 mt-4">
              {filteredExpiring.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-2" />
                    <p className="font-medium">No Certificates Expiring Soon</p>
                  </CardContent>
                </Card>
              ) : (
                filteredExpiring.map((cert) => (
                  <CertificateCard key={cert.id} certificate={cert} />
                ))
              )}
            </TabsContent>
          </Tabs>
        ) : viewMode === 'by-staff' ? (
          <div className="space-y-6">
            {Object.entries(groupByStaff(filteredAll)).map(([staffName, certs]) => (
              <Card key={staffName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {staffName}
                    <Badge variant="outline" className="ml-auto">
                      {certs.length} certificates
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {certs.map((cert) => (
                    <CertificateCard key={cert.id} certificate={cert} compact />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <TrainingComplianceMatrix />
        )}

        {/* Training Records Section */}
        <div className="mt-6">
          <TrainingAcknowledgmentsCard limit={5} />
        </div>
      </div>

      <AddCertificateDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={refetch}
        staffOptions={staffOptions}
        certificateTypes={certificateTypes}
      />

      <TrainingAcknowledgmentDialog
        open={trainingDialogOpen}
        onOpenChange={setTrainingDialogOpen}
        onSuccess={refetch}
        staffOptions={staffOptions}
      />
    </>
  );
}

function CertificateCard({ certificate, compact }: { certificate: any; compact?: boolean }) {
  const today = new Date();
  const expiryDate = certificate.expiry_date ? new Date(certificate.expiry_date) : null;
  const isExpired = expiryDate && expiryDate < today;
  const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, today) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  
  return (
    <Card className={`${isExpired ? 'border-red-300' : isExpiringSoon ? 'border-yellow-300' : ''}`}>
      <CardContent className={compact ? 'py-3' : 'py-4'}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium">{certificate.certificate_type?.name || 'Certificate'}</p>
              {isExpired && (
                <Badge variant="destructive" className="text-xs">Expired</Badge>
              )}
              {isExpiringSoon && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                  {daysUntilExpiry} days left
                </Badge>
              )}
            </div>
            {!compact && (
              <p className="text-sm text-muted-foreground">
                {certificate.staff?.first_name} {certificate.staff?.last_name}
              </p>
            )}
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              {certificate.certificate_number && (
                <span>#{certificate.certificate_number}</span>
              )}
              {certificate.expiry_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expires: {format(new Date(certificate.expiry_date), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
          <Badge variant={isExpired ? 'destructive' : 'default'}>
            {isExpired ? 'Expired' : 'Valid'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
