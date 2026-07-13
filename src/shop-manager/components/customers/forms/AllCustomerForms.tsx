
import React, { useEffect, useState } from 'react';
import { getAllCustomerForms, updateFormStatus } from '@/services/customerFormService';
import { CustomerProvidedForm } from '@/types/customerForms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileIcon, FileText, Download, Eye, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function AllCustomerForms() {
  const [forms, setForms] = useState<CustomerProvidedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  
  const loadForms = async () => {
    setLoading(true);
    const formsData = await getAllCustomerForms();
    setForms(formsData);
    setLoading(false);
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleApproveForm = async (formId: string) => {
    const success = await updateFormStatus(formId, 'approved', reviewNotes);
    if (success) {
      toast({ title: 'Form approved', description: 'The form has been approved' });
      loadForms();
      setReviewNotes('');
      setSelectedForm(null);
    } else {
      toast({ title: 'Error', description: 'Failed to approve form', variant: 'destructive' });
    }
  };
  
  const handleRejectForm = async (formId: string) => {
    const success = await updateFormStatus(formId, 'rejected', reviewNotes);
    if (success) {
      toast({ title: 'Form rejected', description: 'The form has been rejected' });
      loadForms();
      setReviewNotes('');
      setSelectedForm(null);
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
  
  const filteredForms = forms.filter(form => {
    // Filter by search query
    const matchesSearch = 
      form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (form.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (form.customerName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (form.tags && form.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Customer Provided Forms</h2>
        <p className="text-muted-foreground">
          Review and manage forms submitted by customers
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search forms, customers, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-40">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Button variant="outline" onClick={loadForms}>
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid" className="space-y-4">
          {loading ? (
            <div className="text-center py-10">
              <p>Loading forms...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-10 border rounded-md bg-muted/40">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No forms found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 
                  'No forms match your search criteria' : 
                  'No customer forms have been uploaded yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredForms.map(form => (
                <Card key={form.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{form.title}</CardTitle>
                      {getStatusBadge(form.status)}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {form.customerName}
                    </p>
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
                    
                    {selectedForm === form.id && (
                      <div className="mt-4">
                        <Label htmlFor="reviewNotes">Review Notes</Label>
                        <Textarea
                          id="reviewNotes"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add notes for your review decision..."
                          className="mt-1"
                        />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="bg-muted/30 pt-2 pb-2 flex justify-between">
                    <div className="flex space-x-2">
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
                    </div>
                    
                    {form.status === 'pending' && (
                      <div className="flex space-x-2">
                        {selectedForm === form.id ? (
                          <>
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
                          </>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => setSelectedForm(form.id)}
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    )}
                    {form.status !== 'pending' && form.reviewNotes && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-xs"
                        onClick={() => {
                          toast({
                            title: "Review Notes",
                            description: form.reviewNotes,
                          });
                        }}
                      >
                        View Notes
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="list">
          {/* List view implementation */}
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-10 px-4 text-left font-medium">Title</th>
                  <th className="h-10 px-4 text-left font-medium">Customer</th>
                  <th className="h-10 px-4 text-left font-medium">Date</th>
                  <th className="h-10 px-4 text-left font-medium">Status</th>
                  <th className="h-10 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredForms.map(form => (
                  <tr key={form.id} className="border-b">
                    <td className="p-4">
                      <div className="font-medium">{form.title}</div>
                      <div className="text-xs text-muted-foreground">{form.fileName}</div>
                    </td>
                    <td className="p-4">{form.customerName}</td>
                    <td className="p-4">{format(new Date(form.uploadDate), 'MMM d, yyyy')}</td>
                    <td className="p-4">{getStatusBadge(form.status)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={form.url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        {form.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => setSelectedForm(form.id === selectedForm ? null : form.id)}
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
