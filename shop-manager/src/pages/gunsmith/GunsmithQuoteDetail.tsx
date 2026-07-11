import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Crosshair, FileText, Check, X, Wrench, User, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function GunsmithQuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: quote, isLoading } = useQuery({
    queryKey: ['gunsmith-quote', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_quotes')
        .select('*, customers(first_name, last_name, phone, email), gunsmith_firearms(make, model, serial_number, caliber)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const updateQuote = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await (supabase as any)
        .from('gunsmith_quotes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-quote', id] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-quotes'] });
    }
  });

  const handleAccept = () => {
    updateQuote.mutate({ status: 'accepted' }, {
      onSuccess: () => toast({ title: 'Quote accepted' })
    });
  };

  const handleDecline = () => {
    updateQuote.mutate({ status: 'declined' }, {
      onSuccess: () => toast({ title: 'Quote declined' })
    });
  };

  const handleConvertToJob = async () => {
    try {
      const jobNumber = `GS-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await (supabase as any)
        .from('gunsmith_jobs')
        .insert({
          job_number: jobNumber,
          customer_id: quote.customer_id,
          firearm_id: quote.firearm_id,
          job_type: quote.work_description?.split('\n')[0] || 'Service',
          description: quote.work_description,
          status: 'pending',
          priority: 'normal',
          labor_rate: quote.labor_rate,
          labor_hours: quote.estimated_hours,
          parts_cost: quote.parts_estimate,
          total_cost: quote.total_estimate,
          received_date: new Date().toISOString().split('T')[0]
        });
      if (error) throw error;

      await updateQuote.mutateAsync({ status: 'converted' });
      toast({ title: 'Job created from quote' });
      navigate('/gunsmith/jobs');
    } catch (err) {
      toast({ title: 'Failed to create job', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/10 text-green-500';
      case 'converted': return 'bg-blue-500/10 text-blue-500';
      case 'declined': return 'bg-red-500/10 text-red-500';
      case 'expired': return 'bg-muted text-muted-foreground';
      default: return 'bg-yellow-500/10 text-yellow-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading quote...</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Quote not found</p>
            <Button onClick={() => navigate('/gunsmith/quotes')} className="mt-4">
              Back to Quotes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const laborTotal = (quote.estimated_hours || 0) * (quote.labor_rate || 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/quotes')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <FileText className="h-8 w-8 text-amber-600" />
                {quote.quote_number}
              </h1>
              <p className="text-muted-foreground mt-1">Quote Details</p>
            </div>
          </div>
          <Badge className={getStatusColor(quote.status)}>{quote.status}</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quote.customers ? (
                <div className="space-y-1">
                  <p className="font-medium">{quote.customers.first_name} {quote.customers.last_name}</p>
                  <p className="text-sm text-muted-foreground">{quote.customers.phone}</p>
                  <p className="text-sm text-muted-foreground">{quote.customers.email}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No customer assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Firearm Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Crosshair className="h-4 w-4" />
                Firearm
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quote.gunsmith_firearms ? (
                <div className="space-y-1">
                  <p className="font-medium">{quote.gunsmith_firearms.make} {quote.gunsmith_firearms.model}</p>
                  <p className="text-sm text-muted-foreground">S/N: {quote.gunsmith_firearms.serial_number || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{quote.gunsmith_firearms.caliber}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No firearm specified</p>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Validity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{format(new Date(quote.created_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Until:</span>
                <span>{quote.valid_until ? format(new Date(quote.valid_until), 'MMM d, yyyy') : 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Work Description */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Work Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{quote.work_description || 'No description provided'}</p>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor ({quote.estimated_hours || 0} hrs @ ${quote.labor_rate || 0}/hr)</span>
                <span>${laborTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parts Estimate</span>
                <span>${(quote.parts_estimate || 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Estimate</span>
                <span>${(quote.total_estimate || 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {quote.status === 'pending' && (
          <div className="mt-6 flex gap-4">
            <Button onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Accept Quote
            </Button>
            <Button variant="destructive" onClick={handleDecline}>
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        )}

        {quote.status === 'accepted' && (
          <div className="mt-6">
            <Button onClick={handleConvertToJob}>
              <Wrench className="h-4 w-4 mr-2" />
              Convert to Job
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
