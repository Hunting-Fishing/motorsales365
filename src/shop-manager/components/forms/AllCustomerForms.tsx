import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Download, CheckCircle, XCircle, Clock, Search, Wand2 } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerUploadedForm {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: string;
  review_notes: string | null;
  created_at: string;
  customer_id: string | null;
  customers?: { first_name: string; last_name: string } | null;
}

interface AllCustomerFormsProps {
  onDigitize?: (form: CustomerUploadedForm) => void;
}

export function AllCustomerForms({ onDigitize }: AllCustomerFormsProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: forms, isLoading } = useQuery({
    queryKey: ['customer-uploaded-forms', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('customer_uploaded_forms')
        .select(`
          *,
          customers (first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerUploadedForm[];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('customer_uploaded_forms')
        .update({
          status,
          review_notes: notes,
          reviewed_by: user.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-uploaded-forms'] });
      toast({ title: 'Status updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  });

  const handleDownload = async (form: CustomerUploadedForm) => {
    const { data, error } = await supabase.storage
      .from('customer_forms')
      .download(form.file_path);

    if (error) {
      toast({ title: 'Failed to download file', variant: 'destructive' });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = form.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'digitized':
        return <Badge className="bg-blue-500"><Wand2 className="h-3 w-3 mr-1" />Digitized</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredForms = forms?.filter(form =>
    form.title.toLowerCase().includes(search.toLowerCase()) ||
    form.file_name.toLowerCase().includes(search.toLowerCase()) ||
    (form.customers && `${form.customers.first_name} ${form.customers.last_name}`.toLowerCase().includes(search.toLowerCase()))
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, filename, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="digitized">Digitized</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredForms?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No uploaded forms found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredForms?.map((form) => (
            <Card key={form.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{form.title}</h3>
                        {getStatusBadge(form.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{form.file_name}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{formatFileSize(form.file_size)}</span>
                        <span>{format(new Date(form.created_at), 'MMM d, yyyy')}</span>
                        {form.customers && (
                          <span>
                            Customer: {form.customers.first_name} {form.customers.last_name}
                          </span>
                        )}
                      </div>
                      {form.description && (
                        <p className="text-sm text-muted-foreground mt-2">{form.description}</p>
                      )}
                      {form.review_notes && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded text-muted-foreground">
                          Notes: {form.review_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDownload(form)}>
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    {form.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateStatusMutation.mutate({ id: form.id, status: 'approved' })}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: form.id, status: 'rejected' })}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {(form.status === 'approved' || form.status === 'pending') && onDigitize && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onDigitize(form)}
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        Digitize
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
