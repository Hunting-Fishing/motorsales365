
import React, { useEffect, useState } from 'react';
import { CustomerProvidedForm } from '@/types/customerForms';
import { getCustomerForms, updateFormStatus } from '@/services/customerFormService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileIcon, FileText, Download, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { CustomerFormUploader } from './CustomerFormUploader';

interface CustomerFormsListProps {
  customerId: string;
  customerName?: string;
  isAdmin?: boolean;
}

export function CustomerFormsList({ customerId, customerName, isAdmin = false }: CustomerFormsListProps) {
  const [forms, setForms] = useState<CustomerProvidedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  
  const loadForms = async () => {
    setLoading(true);
    const formsData = await getCustomerForms(customerId);
    setForms(formsData);
    setLoading(false);
  };

  useEffect(() => {
    loadForms();
  }, [customerId]);

  const handleApproveForm = async (formId: string) => {
    const success = await updateFormStatus(formId, 'approved');
    if (success) {
      toast({ title: 'Form approved', description: 'The form has been approved' });
      loadForms();
    } else {
      toast({ title: 'Error', description: 'Failed to approve form', variant: 'destructive' });
    }
  };
  
  const handleRejectForm = async (formId: string) => {
    const success = await updateFormStatus(formId, 'rejected');
    if (success) {
      toast({ title: 'Form rejected', description: 'The form has been rejected' });
      loadForms();
    } else {
      toast({ title: 'Error', description: 'Failed to reject form', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border border-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border border-red-300">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">Pending Review</Badge>;
    }
  };
  
  const getIconForFileType = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="h-10 w-10 text-red-500" />;
    } else if (fileType.includes('word') || fileType.includes('doc')) {
      return <FileText className="h-10 w-10 text-blue-500" />;
    } else if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('xls')) {
      return <FileText className="h-10 w-10 text-green-500" />;
    } else if (fileType.includes('image')) {
      return <FileText className="h-10 w-10 text-purple-500" />;
    } else {
      return <FileIcon className="h-10 w-10 text-gray-500" />;
    }
  };
  
  const filteredForms = forms.filter(form => 
    form.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (form.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (form.tags && form.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  if (showUploader) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setShowUploader(false)}>
            Back to Forms
          </Button>
        </div>
        <CustomerFormUploader 
          customerId={customerId}
          customerName={customerName}
          onSuccess={() => {
            loadForms();
            setShowUploader(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Customer Forms</h2>
          <p className="text-sm text-muted-foreground">
            Forms uploaded by or for this customer
          </p>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          Upload New Form
        </Button>
      </div>
      
      <div className="my-4">
        <Input
          placeholder="Search forms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full mb-2" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="text-center py-10 border rounded-md bg-muted/40">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium">No forms found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery ? 'No forms match your search criteria' : 'This customer hasn\'t uploaded any forms yet'}
          </p>
          <Button onClick={() => setShowUploader(true)}>
            Upload a Form
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredForms.map(form => (
            <Card key={form.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{form.title}</CardTitle>
                  {getStatusBadge(form.status)}
                </div>
                {form.description && (
                  <p className="text-sm text-muted-foreground">{form.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  {getIconForFileType(form.fileType)}
                  <div>
                    <p className="font-medium truncate" title={form.fileName}>{form.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(form.fileSize / 1024).toFixed(1)} KB • Uploaded on {format(new Date(form.uploadDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                {form.tags && form.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="bg-blue-50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 pt-2 pb-2 flex justify-between">
                <div className="flex space-x-2">
                  {form.url ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <a href={form.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-1" /> View
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={form.url} download={form.fileName}>
                          <Download className="h-4 w-4 mr-1" /> Download
                        </a>
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  )}
                </div>
                {isAdmin && form.status === 'pending' && (
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => handleApproveForm(form.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => handleRejectForm(form.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
                {isAdmin && form.status !== 'pending' && (
                  <div className="flex items-center text-sm">
                    <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {form.reviewedAt && format(new Date(form.reviewedAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
