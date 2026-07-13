import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface AccountingStream {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  stream_type: string;
  description: string | null;
  is_active: boolean;
  requires_segregation: boolean;
  parent_account_id: string | null;
  reporting_category: string | null;
  tax_treatment: string | null;
  created_at: string;
  updated_at: string;
}

interface AccountingStreamsManagementProps {
  onSubmit?: () => Promise<void>;
}

export function AccountingStreamsManagement({ onSubmit }: AccountingStreamsManagementProps) {
  const { toast } = useToast();
  const [streams, setStreams] = useState<AccountingStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<AccountingStream | null>(null);
  const [formData, setFormData] = useState({
    account_code: "",
    account_name: "",
    account_type: "asset",
    stream_type: "for_profit",
    description: "",
    is_active: true,
    requires_segregation: false,
    parent_account_id: "",
    reporting_category: "",
    tax_treatment: ""
  });

  useEffect(() => {
    loadStreams();
  }, []);

  const loadStreams = async () => {
    try {
      const { data, error } = await supabase
        .from("accounting_streams")
        .select("*")
        .order("account_code");

      if (error) throw error;
      setStreams(data || []);
    } catch (error) {
      console.error("Error loading accounting streams:", error);
      toast({
        title: "Error",
        description: "Failed to load accounting streams.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) throw new Error("Shop not found");

      const streamData = {
        ...formData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      let result;
      if (editingStream) {
        result = await supabase
          .from("accounting_streams")
          .update(streamData)
          .eq("id", editingStream.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("accounting_streams")
          .insert(streamData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Accounting stream ${editingStream ? "updated" : "created"} successfully.`,
      });

      setIsDialogOpen(false);
      setEditingStream(null);
      setFormData({
        account_code: "",
        account_name: "",
        account_type: "asset",
        stream_type: "for_profit",
        description: "",
        is_active: true,
        requires_segregation: false,
        parent_account_id: "",
        reporting_category: "",
        tax_treatment: ""
      });
      loadStreams();

      if (onSubmit) {
        await onSubmit();
      }
    } catch (error) {
      console.error("Error saving accounting stream:", error);
      toast({
        title: "Error",
        description: "Failed to save accounting stream.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStreamStatus = async (stream: AccountingStream) => {
    try {
      const { error } = await supabase
        .from("accounting_streams")
        .update({ is_active: !stream.is_active })
        .eq("id", stream.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Stream ${!stream.is_active ? "activated" : "deactivated"}.`,
      });

      loadStreams();
    } catch (error) {
      console.error("Error toggling stream status:", error);
      toast({
        title: "Error",
        description: "Failed to update stream status.",
        variant: "destructive",
      });
    }
  };

  const deleteStream = async (streamId: string) => {
    if (!confirm("Are you sure you want to delete this accounting stream?")) return;

    try {
      const { error } = await supabase
        .from("accounting_streams")
        .delete()
        .eq("id", streamId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Accounting stream deleted successfully.",
      });

      loadStreams();
    } catch (error) {
      console.error("Error deleting stream:", error);
      toast({
        title: "Error",
        description: "Failed to delete accounting stream.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (stream: AccountingStream) => {
    setEditingStream(stream);
    setFormData({
      account_code: stream.account_code,
      account_name: stream.account_name,
      account_type: stream.account_type,
      stream_type: stream.stream_type,
      description: stream.description || "",
      is_active: stream.is_active,
      requires_segregation: stream.requires_segregation || false,
      parent_account_id: stream.parent_account_id || "",
      reporting_category: stream.reporting_category || "",
      tax_treatment: stream.tax_treatment || ""
    });
    setIsDialogOpen(true);
  };

  const getStreamTypeColor = (type: string) => {
    switch (type) {
      case 'for_profit': return 'bg-blue-500';
      case 'non_profit': return 'bg-green-500';
      case 'shared': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Accounting Streams
            </CardTitle>
            <CardDescription>
              Manage separate accounting streams for for-profit and non-profit activities
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Stream
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingStream ? "Edit" : "Add"} Accounting Stream
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account_code">Account Code</Label>
                    <Input
                      id="account_code"
                      value={formData.account_code}
                      onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                      placeholder="e.g., 1000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_name">Account Name</Label>
                    <Input
                      id="account_name"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      placeholder="e.g., Cash - For-Profit"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account_type">Account Type</Label>
                    <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="stream_type">Stream Type</Label>
                    <Select value={formData.stream_type} onValueChange={(value) => setFormData({ ...formData, stream_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="for_profit">For-Profit</SelectItem>
                        <SelectItem value="non_profit">Non-Profit</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Account description and purpose"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reporting_category">Reporting Category</Label>
                    <Input
                      id="reporting_category"
                      value={formData.reporting_category}
                      onChange={(e) => setFormData({ ...formData, reporting_category: e.target.value })}
                      placeholder="e.g., Operating, Administrative"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax_treatment">Tax Treatment</Label>
                    <Input
                      id="tax_treatment"
                      value={formData.tax_treatment}
                      onChange={(e) => setFormData({ ...formData, tax_treatment: e.target.value })}
                      placeholder="e.g., Taxable, Tax-exempt"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="requires_segregation"
                      checked={formData.requires_segregation}
                      onChange={(e) => setFormData({ ...formData, requires_segregation: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="requires_segregation">Requires Segregation</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : editingStream ? "Update" : "Create"} Stream
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {streams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No accounting streams configured yet. Create your first stream to start segregating accounts.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Segregation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {streams.map((stream) => (
                <TableRow key={stream.id}>
                  <TableCell className="font-mono">{stream.account_code}</TableCell>
                  <TableCell className="font-medium">{stream.account_name}</TableCell>
                  <TableCell className="capitalize">{stream.account_type}</TableCell>
                  <TableCell>
                    <Badge className={getStreamTypeColor(stream.stream_type)}>
                      {stream.stream_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleStreamStatus(stream)}
                      className="flex items-center"
                    >
                      {stream.is_active ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    {stream.requires_segregation ? (
                      <Badge variant="outline" className="text-yellow-600">Required</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(stream)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteStream(stream.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}