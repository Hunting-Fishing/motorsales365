import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Users, Calendar, AlertTriangle, CheckCircle, Mail, Download, Plus } from "lucide-react";
import { ReportTemplateBuilder } from "@/components/nonprofit/ReportTemplateBuilder";

interface BoardMember {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  is_active: boolean;
  start_date: string;
  end_date?: string;
}

interface AnnualFiling {
  id: string;
  filing_name: string;
  filing_type: string;
  due_date: string;
  status: string;
  priority_level: string;
  filing_authority: string;
}

interface DonorAcknowledgment {
  id: string;
  receipt_number: string;
  acknowledgment_type: string;
  tax_deductible_amount: number;
  email_sent: boolean;
  acknowledgment_date: string;
}

export function ReportingComplianceTab() {
  const { toast } = useToast();
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [annualFilings, setAnnualFilings] = useState<AnnualFiling[]>([]);
  const [donorReceipts, setDonorReceipts] = useState<DonorAcknowledgment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportingData();
  }, []);

  const loadReportingData = async () => {
    try {
      const [boardResponse, filingsResponse, receiptsResponse] = await Promise.all([
        supabase.from("board_members").select("*").eq("is_active", true).order("position"),
        supabase.from("annual_filings").select("*").order("due_date"),
        supabase.from("donor_acknowledgments").select("*").order("created_at", { ascending: false }).limit(10)
      ]);

      if (boardResponse.data) setBoardMembers(boardResponse.data);
      if (filingsResponse.data) setAnnualFilings(filingsResponse.data);
      if (receiptsResponse.data) setDonorReceipts(receiptsResponse.data);
    } catch (error) {
      console.error("Error loading reporting data:", error);
      toast({
        title: "Error",
        description: "Failed to load reporting data.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'filed':
      case 'completed':
        return 'bg-green-500';
      case 'pending':
      case 'in_progress':
        return 'bg-blue-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const sendDonorReceipt = async (donationData: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('send-donor-receipt', {
        body: donationData
      });

      if (error) throw error;

      toast({
        title: "Receipt Sent",
        description: `Donor receipt ${data.receiptNumber} has been sent successfully.`,
      });

      loadReportingData(); // Refresh the data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send donor receipt.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Reporting & Compliance</h2>
        <p className="text-muted-foreground">
          Manage non-profit reporting, donor acknowledgments, board governance, and annual filings
        </p>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Donor Receipts
          </TabsTrigger>
          <TabsTrigger value="board" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Board
          </TabsTrigger>
          <TabsTrigger value="filings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Filings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Report Templates
                  </CardTitle>
                  <CardDescription>
                    Manage non-profit specific reporting templates
                  </CardDescription>
                </div>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ReportTemplateBuilder />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Donor Acknowledgments
                  </CardTitle>
                  <CardDescription>
                    Generate and send donor receipts and acknowledgments
                  </CardDescription>
                </div>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Send Receipt
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donorReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No donor receipts generated yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    donorReceipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                        <TableCell className="capitalize">{receipt.acknowledgment_type}</TableCell>
                        <TableCell>${receipt.tax_deductible_amount?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          {new Date(receipt.acknowledgment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={receipt.email_sent ? 'bg-green-500' : 'bg-yellow-500'}>
                            {receipt.email_sent ? 'Sent' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="board">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Board Members
                  </CardTitle>
                  <CardDescription>
                    Manage board composition and governance
                  </CardDescription>
                </div>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boardMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No board members added yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    boardMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.first_name} {member.last_name}
                        </TableCell>
                        <TableCell className="capitalize">{member.position.replace('_', ' ')}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          {new Date(member.start_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={member.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm">View</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Annual Filings
                  </CardTitle>
                  <CardDescription>
                    Track regulatory filings and deadlines
                  </CardDescription>
                </div>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Filing
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {annualFilings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No annual filings configured yet
                  </div>
                ) : (
                  annualFilings.map((filing) => (
                    <div key={filing.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(filing.priority_level)}
                          <h4 className="font-medium">{filing.filing_name}</h4>
                        </div>
                        <Badge className={getStatusColor(filing.status)}>
                          {filing.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Type</Label>
                          <div className="font-medium capitalize">
                            {filing.filing_type.replace('_', ' ')}
                          </div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Authority</Label>
                          <div className="font-medium">{filing.filing_authority}</div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Due Date</Label>
                          <div className="font-medium">
                            {new Date(filing.due_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Priority</Label>
                          <div className="font-medium capitalize">{filing.priority_level}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Mark Filed</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}