import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmailCampaigns } from "@/hooks/email/useEmailCampaigns";
import { EmailCampaignStatus } from "@/types/email";
import { format } from "date-fns";
import { Plus, Calendar, Play, PauseCircle, XCircle, Clock, Users, Mail, BarChart } from "lucide-react";
import { Link } from "react-router-dom";

export default function EmailCampaigns() {
  const [activeStatus, setActiveStatus] = useState<EmailCampaignStatus | 'all'>('all');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [campaignToSchedule, setCampaignToSchedule] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  
  const { 
    campaigns, 
    loading, 
    scheduleCampaign,
    sendCampaignNow,
    pauseCampaign,
    cancelCampaign
  } = useEmailCampaigns();

  const filteredCampaigns = activeStatus === 'all' 
    ? campaigns 
    : campaigns.filter(campaign => campaign.status === activeStatus);

  const handleScheduleClick = (campaignId: string) => {
    setCampaignToSchedule(campaignId);
    // Default to tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    setScheduledDate(tomorrow.toISOString().slice(0, 16));
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async () => {
    if (!campaignToSchedule || !scheduledDate) return;
    
    const success = await scheduleCampaign(campaignToSchedule, new Date(scheduledDate).toISOString());
    if (success) {
      setIsScheduleModalOpen(false);
      setCampaignToSchedule(null);
    }
  };

  const handleSendNow = async (campaignId: string) => {
    await sendCampaignNow(campaignId);
  };

  const handlePauseCampaign = async (campaignId: string) => {
    await pauseCampaign(campaignId);
  };

  const handleCancelCampaign = async (campaignId: string) => {
    await cancelCampaign(campaignId);
  };

  const getStatusBadge = (status: EmailCampaignStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Scheduled</Badge>;
      case 'sending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Sending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Sent</Badge>;
      case 'paused':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">Paused</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Campaigns</h1>
          <p className="text-muted-foreground">
            Create, manage, and track your email marketing campaigns
          </p>
        </div>
        <Button asChild>
          <Link to="/email-templates">
            <Plus className="mr-2 h-4 w-4" /> Create Campaign
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Mail className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Campaigns</p>
                  <p className="text-2xl font-bold">{campaigns.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Users className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Recipients</p>
                  <p className="text-2xl font-bold">
                    {campaigns.reduce((sum, campaign) => sum + campaign.totalRecipients, 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <BarChart className="h-5 w-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Open Rate</p>
                  <p className="text-2xl font-bold">
                    {campaigns.length === 0 ? "0%" : 
                      `${Math.round(
                        (campaigns.reduce((sum, campaign) => sum + campaign.opened, 0) / 
                        campaigns.reduce((sum, campaign) => sum + campaign.totalRecipients, 0)) * 100
                      )}%`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>
              Overall engagement metrics for your recent campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Open Rate</span>
                  <span className="text-sm font-medium">
                    {campaigns.length === 0 ? "0%" : 
                      `${Math.round(
                        (campaigns.reduce((sum, campaign) => sum + campaign.opened, 0) / 
                        campaigns.reduce((sum, campaign) => sum + campaign.totalRecipients, 0)) * 100
                      )}%`}
                  </span>
                </div>
                <Progress 
                  value={campaigns.length === 0 ? 0 : 
                    (campaigns.reduce((sum, campaign) => sum + campaign.opened, 0) / 
                     campaigns.reduce((sum, campaign) => sum + campaign.totalRecipients, 0)) * 100
                  } 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Click Rate</span>
                  <span className="text-sm font-medium">
                    {campaigns.length === 0 ? "0%" : 
                      `${Math.round(
                        (campaigns.reduce((sum, campaign) => sum + campaign.clicked, 0) / 
                        campaigns.reduce((sum, campaign) => sum + campaign.totalRecipients, 0)) * 100
                      )}%`}
                  </span>
                </div>
                <Progress 
                  value={campaigns.length === 0 ? 0 : 
                    (campaigns.reduce((sum, campaign) => sum + campaign.clicked, 0) / 
                     campaigns.reduce((sum, campaign) => sum + campaign.totalRecipients, 0)) * 100
                  } 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Click-to-Open Rate</span>
                  <span className="text-sm font-medium">
                    {campaigns.reduce((sum, campaign) => sum + campaign.opened, 0) === 0 ? "0%" : 
                      `${Math.round(
                        (campaigns.reduce((sum, campaign) => sum + campaign.clicked, 0) / 
                        campaigns.reduce((sum, campaign) => sum + campaign.opened, 0)) * 100
                      )}%`}
                  </span>
                </div>
                <Progress 
                  value={campaigns.reduce((sum, campaign) => sum + campaign.opened, 0) === 0 ? 0 : 
                    (campaigns.reduce((sum, campaign) => sum + campaign.clicked, 0) / 
                     campaigns.reduce((sum, campaign) => sum + campaign.opened, 0)) * 100
                  } 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Email Campaigns</CardTitle>
              <CardDescription>
                Manage and track your email marketing campaigns
              </CardDescription>
            </div>
            <Tabs 
              value={activeStatus} 
              onValueChange={(value) => setActiveStatus(value as EmailCampaignStatus | 'all')}
            >
              <TabsList className="grid grid-cols-3 md:grid-cols-7">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="sending">Sending</TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
                <TabsTrigger value="paused">Paused</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Loading campaigns...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No campaigns found</p>
              <Button asChild className="mt-4">
                <Link to="/email-templates">
                  <Plus className="mr-2 h-4 w-4" /> Create Campaign
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {campaign.subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(campaign.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {campaign.totalRecipients.toLocaleString()} recipients
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs flex justify-between">
                            <span>Opens:</span>
                            <span className="font-medium">
                              {campaign.totalRecipients > 0 
                                ? `${Math.round((campaign.opened / campaign.totalRecipients) * 100)}%` 
                                : '0%'}
                            </span>
                          </div>
                          <Progress 
                            value={campaign.totalRecipients > 0 
                              ? (campaign.opened / campaign.totalRecipients) * 100 
                              : 0} 
                            className="h-1"
                          />
                          <div className="text-xs flex justify-between">
                            <span>Clicks:</span>
                            <span className="font-medium">
                              {campaign.totalRecipients > 0 
                                ? `${Math.round((campaign.clicked / campaign.totalRecipients) * 100)}%` 
                                : '0%'}
                            </span>
                          </div>
                          <Progress 
                            value={campaign.totalRecipients > 0 
                              ? (campaign.clicked / campaign.totalRecipients) * 100 
                              : 0} 
                            className="h-1"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {campaign.status === 'sent' && campaign.sent_at ? (
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(campaign.sent_at), 'MMM d, yyyy')}
                          </div>
                        ) : campaign.status === 'scheduled' && campaign.scheduled_at ? (
                          <div className="flex items-center text-sm">
                            <Clock className="mr-1 h-3 w-3" />
                            {format(new Date(campaign.scheduled_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {campaign.status === 'draft' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSendNow(campaign.id)}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                Send Now
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleScheduleClick(campaign.id)}
                              >
                                <Calendar className="mr-1 h-3 w-3" />
                                Schedule
                              </Button>
                            </>
                          )}
                          {campaign.status === 'scheduled' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSendNow(campaign.id)}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                Send Now
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCancelCampaign(campaign.id)}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Cancel
                              </Button>
                            </>
                          )}
                          {campaign.status === 'sending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePauseCampaign(campaign.id)}
                            >
                              <PauseCircle className="mr-1 h-3 w-3" />
                              Pause
                            </Button>
                          )}
                          {campaign.status === 'paused' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSendNow(campaign.id)}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                Resume
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCancelCampaign(campaign.id)}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Cancel
                              </Button>
                            </>
                          )}
                          {(campaign.status === 'sent' || campaign.status === 'cancelled') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              asChild
                            >
                              <Link to={`/email-campaigns/${campaign.id}/analytics`}>
                                <BarChart className="mr-1 h-3 w-3" />
                                View Report
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Campaign Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Campaign</DialogTitle>
            <DialogDescription>
              Choose when to send this email campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-date">Date and Time</Label>
              <Input
                id="schedule-date"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsScheduleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleScheduleSubmit}>
                Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
