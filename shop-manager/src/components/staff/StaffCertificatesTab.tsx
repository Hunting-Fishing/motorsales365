import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle, Award, Calendar, FileText } from 'lucide-react';
import { useStaffCertificates } from '@/hooks/useStaffCertificates';
import { AddCertificateDialog } from './certificates/AddCertificateDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';

interface StaffCertificatesTabProps {
  staffId: string;
}

interface EditCertificateState {
  open: boolean;
  certificate: any | null;
}

export function StaffCertificatesTab({ staffId }: StaffCertificatesTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editState, setEditState] = useState<EditCertificateState>({ open: false, certificate: null });
  const { certificates, isLoading, deleteCertificate, updateCertificate } = useStaffCertificates(staffId);

  const getStatusBadge = (status: string, expiryDate: string | null) => {
    if (status === 'expired') {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (status === 'suspended') {
      return <Badge variant="outline">Suspended</Badge>;
    }
    if (status === 'revoked') {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    
    // Check if expiring soon
    if (expiryDate) {
      const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30) {
        return <Badge variant="destructive">Expiring Soon</Badge>;
      }
      if (daysUntilExpiry <= 60) {
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Expiring in {daysUntilExpiry} days</Badge>;
      }
    }
    
    return <Badge variant="default" className="bg-green-500">Active</Badge>;
  };

  const expiringCerts = certificates?.filter(cert => {
    if (!cert.expiry_date || cert.status !== 'active') return false;
    const daysUntilExpiry = Math.ceil((new Date(cert.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90;
  }) || [];

  if (isLoading) {
    return <div>Loading certificates...</div>;
  }

  return (
    <div className="space-y-6">
      {expiringCerts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Certificates Expiring Soon</AlertTitle>
          <AlertDescription>
            {expiringCerts.length} certificate{expiringCerts.length > 1 ? 's' : ''} will expire within 90 days.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Certificates & Training</h3>
          <p className="text-sm text-muted-foreground">
            Manage marine certificates and training records
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Certificate
        </Button>
      </div>

      {!certificates || certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No certificates added yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((cert) => (
            <Card key={cert.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      {cert.staff_certificate_types?.name}
                    </CardTitle>
                    {cert.certificate_number && (
                      <CardDescription className="mt-1">
                        #{cert.certificate_number}
                      </CardDescription>
                    )}
                  </div>
                  {getStatusBadge(cert.status, cert.expiry_date)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cert.issuing_authority && (
                  <div className="flex items-center text-sm">
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Issued by:</span>
                    <span className="ml-2">{cert.issuing_authority}</span>
                  </div>
                )}
                
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Issued:</span>
                  <span className="ml-2">{format(new Date(cert.issue_date), 'MMM d, yyyy')}</span>
                </div>

                {cert.expiry_date && (
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="ml-2">{format(new Date(cert.expiry_date), 'MMM d, yyyy')}</span>
                  </div>
                )}

                {cert.training_date && (
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Training:</span>
                    <span className="ml-2">{format(new Date(cert.training_date), 'MMM d, yyyy')}</span>
                  </div>
                )}

                {cert.notes && (
                  <p className="text-sm text-muted-foreground border-t pt-3">
                    {cert.notes}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditState({ open: true, certificate: cert })}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this certificate?')) {
                        deleteCertificate(cert.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddCertificateDialog
        staffId={staffId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Edit Certificate Dialog - reuses AddCertificateDialog with editMode */}
      {editState.certificate && (
        <AddCertificateDialog
          staffId={staffId}
          open={editState.open}
          onOpenChange={(open) => !open && setEditState({ open: false, certificate: null })}
          editCertificate={editState.certificate}
        />
      )}
    </div>
  );
}
