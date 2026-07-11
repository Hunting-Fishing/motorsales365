import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HandHeart, BadgeDollarSign, Users, BookUser, Book, BarChart3, FileText } from "lucide-react";
import { HybridModelTab } from "./HybridModelTab";
import { ReportingComplianceTab } from "./ReportingComplianceTab";
import { DonationManagement } from "@/components/nonprofit/DonationManagement";
import { MemberManagement } from "@/components/nonprofit/MemberManagement";
import { VolunteerHourTracking } from "@/components/nonprofit/VolunteerHourTracking";
import { GrantFundingManagement } from "@/components/nonprofit/GrantFundingManagement";

interface TaxExemptStatus {
  is_tax_exempt: boolean;
  tax_exempt_number: string;
  exemption_type: string;
  effective_date: string;
  expiry_date: string;
}

export function NonProfitTab() {
  const { toast } = useToast();
  const [taxStatus, setTaxStatus] = useState<TaxExemptStatus>({
    is_tax_exempt: false,
    tax_exempt_number: "",
    exemption_type: "",
    effective_date: "",
    expiry_date: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTaxExemptStatus();
  }, []);

  const loadTaxExemptStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("settings_value")
        .eq("settings_key", "tax_exempt_status")
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.settings_value) {
        setTaxStatus(data.settings_value as unknown as TaxExemptStatus);
      }
    } catch (error) {
      console.error("Error loading tax exempt status:", error);
    }
  };

  const saveTaxExemptStatus = async () => {
    setLoading(true);
    try {
      // Get user's shop_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error("Shop ID not found");
      }

      const { error } = await supabase
        .from("company_settings")
        .upsert({
          shop_id: profile.shop_id,
          settings_key: "tax_exempt_status",
          settings_value: taxStatus as any
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Tax exempt status has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save tax exempt status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Non-Profit Management</h2>
        <p className="text-muted-foreground">
          Configure settings and features specifically designed for non-profit organizations
        </p>
      </div>

      <Tabs defaultValue="tax-status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="tax-status" className="flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4" />
            Tax Status
          </TabsTrigger>
          <TabsTrigger value="donations" className="flex items-center gap-2">
            <HandHeart className="h-4 w-4" />
            Donations
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="volunteers" className="flex items-center gap-2">
            <BookUser className="h-4 w-4" />
            Volunteers
          </TabsTrigger>
          <TabsTrigger value="funding" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            Funding
          </TabsTrigger>
          <TabsTrigger value="hybrid" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Hybrid Models
          </TabsTrigger>
          <TabsTrigger value="reporting" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reporting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tax-status">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeDollarSign className="h-5 w-5 text-primary" />
                Tax Exempt Status
              </CardTitle>
              <CardDescription>
                Configure your organization's tax exemption status and details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="tax-exempt"
                  checked={taxStatus.is_tax_exempt}
                  onCheckedChange={(checked) => 
                    setTaxStatus(prev => ({ ...prev, is_tax_exempt: checked }))
                  }
                />
                <Label htmlFor="tax-exempt">Organization is tax exempt</Label>
              </div>

              {taxStatus.is_tax_exempt && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-number">Tax Exempt Number</Label>
                    <Input
                      id="tax-number"
                      value={taxStatus.tax_exempt_number}
                      onChange={(e) => 
                        setTaxStatus(prev => ({ ...prev, tax_exempt_number: e.target.value }))
                      }
                      placeholder="501(c)(3) EIN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exemption-type">Exemption Type</Label>
                    <Select 
                      value={taxStatus.exemption_type} 
                      onValueChange={(value) => 
                        setTaxStatus(prev => ({ ...prev, exemption_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exemption type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="501c3">501(c)(3) - Charitable</SelectItem>
                        <SelectItem value="501c4">501(c)(4) - Social Welfare</SelectItem>
                        <SelectItem value="501c6">501(c)(6) - Business League</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="effective-date">Effective Date</Label>
                    <Input
                      id="effective-date"
                      type="date"
                      value={taxStatus.effective_date}
                      onChange={(e) => 
                        setTaxStatus(prev => ({ ...prev, effective_date: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry-date">Expiry Date (if applicable)</Label>
                    <Input
                      id="expiry-date"
                      type="date"
                      value={taxStatus.expiry_date}
                      onChange={(e) => 
                        setTaxStatus(prev => ({ ...prev, expiry_date: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              <Button onClick={saveTaxExemptStatus} disabled={loading}>
                {loading ? "Saving..." : "Save Tax Status"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donations">
          <DonationManagement />
        </TabsContent>

        <TabsContent value="members">
          <MemberManagement />
        </TabsContent>

        <TabsContent value="volunteers">
          <VolunteerHourTracking />
        </TabsContent>

        <TabsContent value="funding">
          <GrantFundingManagement />
        </TabsContent>

        <TabsContent value="hybrid">
          <HybridModelTab />
        </TabsContent>

        <TabsContent value="reporting">
          <ReportingComplianceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}