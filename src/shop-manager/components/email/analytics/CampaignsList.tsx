
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Mail, MousePointer, Users } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  sent_date: string;
  open_rate: number;
  click_rate: number;
  total_emails: number;
}

export function CampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('email_campaigns')
          .select('*')
          .order('sent_date', { ascending: false });

        if (error) {
          console.error('Error fetching campaigns:', error);
        } else {
          // Transform data to match Campaign interface
          const transformedCampaigns: Campaign[] = (data || []).map(campaign => ({
            id: campaign.id,
            name: campaign.name,
            subject: campaign.subject || '',
            sent_date: campaign.sent_date || campaign.created_at,
            open_rate: Math.round((campaign.opened / Math.max(campaign.total_recipients, 1)) * 100),
            click_rate: Math.round((campaign.clicked / Math.max(campaign.total_recipients, 1)) * 100),
            total_emails: campaign.total_recipients || 0
          }));
          setCampaigns(transformedCampaigns);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Campaigns</CardTitle>
        <CardDescription>List of all email campaigns and their performance</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading campaigns...</div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                  <TableHead className="text-right">Click Rate</TableHead>
                  <TableHead className="text-right">Total Emails</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.subject}</TableCell>
                    <TableCell>{new Date(campaign.sent_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        <Mail className="h-4 w-4 mr-1" />
                        {campaign.open_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        <MousePointer className="h-4 w-4 mr-1" />
                        {campaign.click_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">
                        <Users className="h-4 w-4 mr-1" />
                        {campaign.total_emails}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
