
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Award, Plus, Calendar, Building2, FileText, ExternalLink, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useTeamMemberCertificates } from "@/hooks/team/useTeamMemberCertificates";
import { useTeamMemberTraining } from "@/hooks/team/useTeamMemberTraining";
import { format, isPast, differenceInDays } from "date-fns";
import { CertificateDialog } from "./certifications/CertificateDialog";
import { TrainingDialog } from "./certifications/TrainingDialog";

interface CertificationsTabProps {
  memberId: string;
  memberName: string;
}

export function CertificationsTab({ memberId, memberName }: CertificationsTabProps) {
  const { certificates, isLoading: certsLoading, addCertificate, updateCertificate, deleteCertificate } = useTeamMemberCertificates(memberId);
  const { training, isLoading: trainingLoading, addTraining, updateTraining, deleteTraining } = useTeamMemberTraining(memberId);
  
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<any>(null);
  const [editingTraining, setEditingTraining] = useState<any>(null);

  const getCertStatusBadge = (cert: any) => {
    if (cert.status === 'expired' || (cert.expiry_date && isPast(new Date(cert.expiry_date)))) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    if (cert.expiry_date) {
      const daysUntilExpiry = differenceInDays(new Date(cert.expiry_date), new Date());
      if (daysUntilExpiry <= 30) {
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" />Expiring Soon</Badge>;
      }
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
  };

  const getTrainingStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { icon: Clock, color: "bg-blue-500/10 text-blue-700 border-blue-500/20", label: "Scheduled" },
      in_progress: { icon: Clock, color: "bg-purple-500/10 text-purple-700 border-purple-500/20", label: "In Progress" },
      completed: { icon: CheckCircle2, color: "bg-green-500/10 text-green-700 border-green-500/20", label: "Completed" },
      cancelled: { icon: XCircle, color: "bg-red-500/10 text-red-700 border-red-500/20", label: "Cancelled" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;
    return <Badge variant="outline" className={config.color}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>;
  };

  if (certsLoading || trainingLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Certificates Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Certificates & Licenses
              </CardTitle>
              <CardDescription>Professional certifications and licenses</CardDescription>
            </div>
            <Button onClick={() => { setEditingCert(null); setCertDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Certificate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {certificates.length > 0 ? (
            <div className="space-y-4">
              {certificates.map(cert => (
                <div key={cert.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{cert.certificate_name}</h4>
                        {getCertStatusBadge(cert)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        <Building2 className="h-3 w-3 inline mr-1" />
                        {cert.issuing_organization}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span><Calendar className="h-3 w-3 inline mr-1" />Issued: {format(new Date(cert.issue_date), 'MMM d, yyyy')}</span>
                        {cert.expiry_date && (
                          <>
                            <span>•</span>
                            <span>Expires: {format(new Date(cert.expiry_date), 'MMM d, yyyy')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingCert(cert); setCertDialogOpen(true); }}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteCertificate(cert.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  {cert.certificate_number && (
                    <p className="text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 inline mr-1" />
                      Certificate #: {cert.certificate_number}
                    </p>
                  )}
                  {cert.verification_url && (
                    <a href={cert.verification_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                      <ExternalLink className="h-3 w-3" />
                      Verify Certificate
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Certificates</h3>
              <p className="text-muted-foreground mb-4">No certificates have been added yet</p>
              <Button onClick={() => { setEditingCert(null); setCertDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Certificate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Training & Education
              </CardTitle>
              <CardDescription>Completed and ongoing training programs</CardDescription>
            </div>
            <Button onClick={() => { setEditingTraining(null); setTrainingDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Training
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {training.length > 0 ? (
            <div className="space-y-4">
              {training.map(t => (
                <div key={t.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{t.training_name}</h4>
                        {getTrainingStatusBadge(t.status)}
                        <Badge variant="secondary" className="text-xs">{t.training_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        <Building2 className="h-3 w-3 inline mr-1" />
                        {t.provider}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span><Calendar className="h-3 w-3 inline mr-1" />Started: {format(new Date(t.start_date), 'MMM d, yyyy')}</span>
                        {t.completion_date && (
                          <>
                            <span>•</span>
                            <span>Completed: {format(new Date(t.completion_date), 'MMM d, yyyy')}</span>
                          </>
                        )}
                        {t.duration_hours && (
                          <>
                            <span>•</span>
                            <span>{t.duration_hours}h</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingTraining(t); setTrainingDialogOpen(true); }}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteTraining(t.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  {t.score && (
                    <p className="text-xs text-muted-foreground">
                      Score: {t.score}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Training Records</h3>
              <p className="text-muted-foreground mb-4">No training records have been added yet</p>
              <Button onClick={() => { setEditingTraining(null); setTrainingDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Training
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CertificateDialog
        open={certDialogOpen}
        onOpenChange={setCertDialogOpen}
        memberId={memberId}
        memberName={memberName}
        editingCertificate={editingCert}
        onSave={async (data) => {
          if (editingCert) {
            return await updateCertificate(editingCert.id, data);
          } else {
            return await addCertificate(data);
          }
        }}
      />

      <TrainingDialog
        open={trainingDialogOpen}
        onOpenChange={setTrainingDialogOpen}
        memberId={memberId}
        memberName={memberName}
        editingTraining={editingTraining}
        onSave={async (data) => {
          if (editingTraining) {
            return await updateTraining(editingTraining.id, data);
          } else {
            return await addTraining(data);
          }
        }}
      />
    </div>
  );
}
