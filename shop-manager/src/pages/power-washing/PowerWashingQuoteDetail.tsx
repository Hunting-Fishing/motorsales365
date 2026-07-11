import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Briefcase,
  Send,
  Printer
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generateQuotePDF } from '@/utils/power-washing/generateQuotePDF';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  contacted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  quoted: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  accepted: 'bg-green-500/10 text-green-500 border-green-500/20',
  declined: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending Review',
  contacted: 'Customer Contacted',
  quoted: 'Quote Sent',
  accepted: 'Accepted',
  declined: 'Declined',
};

export default function PowerWashingQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quote, isLoading } = useQuery({
    queryKey: ['power-washing-quote', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_quotes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('power_washing_quotes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-quote', id] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-quotes'] });
      toast.success('Quote status updated');
    },
    onError: () => {
      toast.error('Failed to update quote status');
    },
  });

  const handleConvertToJob = () => {
    navigate(`/power-washing/jobs/new?fromQuote=${id}`);
  };

  if (isLoading) {
    return (
      <MobilePageContainer>
        <MobilePageHeader
          title="Quote Details"
          onBack={() => navigate('/power-washing/quotes')}
        />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </MobilePageContainer>
    );
  }

  if (!quote) {
    return (
      <MobilePageContainer>
        <MobilePageHeader
          title="Quote Not Found"
          onBack={() => navigate('/power-washing/quotes')}
        />
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Quote not found</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/power-washing/quotes')} 
              className="mt-4"
            >
              Back to Quotes
            </Button>
          </CardContent>
        </Card>
      </MobilePageContainer>
    );
  }

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title={quote.quote_number}
        subtitle={`Created ${format(new Date(quote.created_at), 'MMM d, yyyy')}`}
        icon={<FileText className="h-6 w-6 md:h-8 md:w-8 text-cyan-600" />}
        onBack={() => navigate('/power-washing/quotes')}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateQuotePDF(quote)}
            >
              <Printer className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-4 md:space-y-6">
          {/* Status & Actions Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Status</CardTitle>
                <Badge className={statusColors[quote.status] || ''}>
                  {statusLabels[quote.status] || quote.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {quote.status === 'pending' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate('contacted')}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Mark Contacted
                  </Button>
                )}
                {(quote.status === 'pending' || quote.status === 'contacted') && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate('quoted')}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Quote
                  </Button>
                )}
                {quote.status === 'quoted' && (
                  <>
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => updateStatusMutation.mutate('accepted')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Accepted
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => updateStatusMutation.mutate('declined')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Mark Declined
                    </Button>
                  </>
                )}
                {quote.status === 'accepted' && (
                  <Button 
                    size="sm" 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={handleConvertToJob}
                  >
                    <Briefcase className="h-4 w-4 mr-1" />
                    Convert to Job
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Services Requested */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Services Requested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {quote.services_requested?.map((service: string) => (
                  <Badge key={service} variant="secondary" className="text-sm">
                    {service.replace(/_/g, ' ')}
                  </Badge>
                )) || <p className="text-muted-foreground">No services specified</p>}
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{quote.property_address}</span>
              </div>
              {quote.property_type && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline">{quote.property_type}</Badge>
                </div>
              )}
              {quote.estimated_sqft && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Size:</span>
                  <span>{quote.estimated_sqft.toLocaleString()} sq ft</span>
                </div>
              )}
              {quote.additional_details && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{quote.additional_details}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-lg">{quote.customer_name}</p>
              </div>
              {quote.customer_phone && (
                <a 
                  href={`tel:${quote.customer_phone}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {quote.customer_phone}
                </a>
              )}
              {quote.customer_email && (
                <a 
                  href={`mailto:${quote.customer_email}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {quote.customer_email}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quote.quoted_price ? (
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-green-600">
                    ${quote.quoted_price.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Quoted Price</p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Price not yet quoted
                </p>
              )}
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quote.preferred_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Preferred Date</p>
                  <p className="font-medium">{format(new Date(quote.preferred_date), 'MMMM d, yyyy')}</p>
                </div>
              )}
              {quote.flexibility && (
                <div>
                  <p className="text-sm text-muted-foreground">Flexibility</p>
                  <p className="font-medium">{quote.flexibility}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <Badge variant="outline">{quote.source || 'Direct'}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobilePageContainer>
  );
}
