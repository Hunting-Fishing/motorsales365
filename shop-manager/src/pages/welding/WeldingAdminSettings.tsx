import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWeldingSettings, previewNumber, WeldingSettings } from "@/contexts/WeldingSettingsContext";
import { useShopId } from "@/hooks/useShopId";
import { weldingAdminLinks } from "@/components/welding/WeldingAdminLayout";
import WeldingAdminLayout from "@/components/welding/WeldingAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, DollarSign, FileText, Smartphone, Bell, Clock, Upload, Plus, Pencil, Trash2, X } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface LabourRate {
  id?: string;
  shop_id?: string;
  name: string;
  rate: number;
  description: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

const WeldingAdminSettings = () => {
  const { settings, loading, reload } = useWeldingSettings();
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<WeldingSettings>>({});
  const [activeTab, setActiveTab] = useState("company");
  const [rateDialog, setRateDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<LabourRate | null>(null);
  const [rateForm, setRateForm] = useState<LabourRate>({ name: "", rate: 0, description: "", is_default: false, is_active: true, sort_order: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (!loading) setForm({ ...settings }); }, [loading, settings]);

  // Labour rates query
  const { data: labourRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ["welding-labour-rates", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_labour_rates" as any).select("*").eq("shop_id", shopId).order("sort_order");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  // Save main settings
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (settings.id) {
        const { error } = await supabase.from("welding_company_settings" as any).update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("welding_company_settings" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => { await reload(); toast.success("Settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Save labour rate
  const saveRateMutation = useMutation({
    mutationFn: async (rate: LabourRate) => {
      if (rate.id) {
        const { id, shop_id, ...rest } = rate as any;
        delete rest.created_at; delete rest.updated_at;
        const { error } = await supabase.from("welding_labour_rates" as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("welding_labour_rates" as any).insert({ ...rate, shop_id: shopId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["welding-labour-rates"] });
      setRateDialog(false);
      toast.success("Rate saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("welding_labour_rates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["welding-labour-rates"] });
      toast.success("Rate deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const CURRENCY_MAP: Record<string, { symbol: string; label: string }> = {
    CAD: { symbol: "$", label: "CAD — Canadian Dollar ($)" },
    USD: { symbol: "$", label: "USD — US Dollar ($)" },
    EUR: { symbol: "€", label: "EUR — Euro (€)" },
    GBP: { symbol: "£", label: "GBP — British Pound (£)" },
    AUD: { symbol: "$", label: "AUD — Australian Dollar ($)" },
    MXN: { symbol: "$", label: "MXN — Mexican Peso ($)" },
    JPY: { symbol: "¥", label: "JPY — Japanese Yen (¥)" },
    INR: { symbol: "₹", label: "INR — Indian Rupee (₹)" },
  };

  const set = (field: string, value: any) => {
    if (field === "currency") {
      const sym = CURRENCY_MAP[value]?.symbol || "$";
      setForm((f) => ({ ...f, currency: value, currency_symbol: sym }));
    } else {
      setForm((f) => ({ ...f, [field]: value }));
    }
  };

  const toggleQuickLink = (label: string) => {
    const current = (form.mobile_quick_links || []) as string[];
    if (current.includes(label)) set("mobile_quick_links", current.filter((l) => l !== label));
    else if (current.length < 5) set("mobile_quick_links", [...current, label]);
    else toast.error("Max 5 quick links");
  };

  // Business hours helpers
  const getBusinessHours = () => {
    const bh = (form as any).business_hours;
    if (bh && typeof bh === "object") return bh;
    const defaultHours: Record<string, any> = {};
    DAYS.forEach(day => { defaultHours[day] = { open: "08:00", close: "17:00", closed: day === "Saturday" || day === "Sunday" }; });
    return defaultHours;
  };

  const setBusinessHour = (day: string, field: string, value: any) => {
    const hours = { ...getBusinessHours() };
    hours[day] = { ...hours[day], [field]: value };
    set("business_hours", hours);
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `welding-logos/${shopId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("public-assets").getPublicUrl(path);
      set("logo_url", publicUrl);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openRateDialog = (rate?: any) => {
    if (rate) {
      setEditingRate(rate);
      setRateForm({ ...rate });
    } else {
      setEditingRate(null);
      setRateForm({ name: "", rate: 0, description: "", is_default: false, is_active: true, sort_order: labourRates.length });
    }
    setRateDialog(true);
  };

  if (loading) return <WeldingAdminLayout><p className="text-muted-foreground text-center py-12">Loading settings...</p></WeldingAdminLayout>;

  const f = form as any;

  return (
    <WeldingAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Settings</h1>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto">
          <TabsTrigger value="company" className="flex items-center gap-1.5 text-xs md:text-sm"><Building2 className="h-4 w-4" /><span className="hidden sm:inline">Company</span></TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-1.5 text-xs md:text-sm"><DollarSign className="h-4 w-4" /><span className="hidden sm:inline">Financial</span></TabsTrigger>
          <TabsTrigger value="rates" className="flex items-center gap-1.5 text-xs md:text-sm"><Clock className="h-4 w-4" /><span className="hidden sm:inline">Rates</span></TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5 text-xs md:text-sm"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Documents</span></TabsTrigger>
          <TabsTrigger value="mobile" className="flex items-center gap-1.5 text-xs md:text-sm"><Smartphone className="h-4 w-4" /><span className="hidden sm:inline">Mobile</span></TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs md:text-sm"><Bell className="h-4 w-4" /><span className="hidden sm:inline">Alerts</span></TabsTrigger>
        </TabsList>

        {/* ─── COMPANY TAB ─── */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Company Logo</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted">
                  {f.logo_url ? (
                    <>
                      <img src={f.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      <button onClick={() => set("logo_url", null)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading..." : "Upload Logo"}
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB. Recommended: 200×200px</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">or URL:</span>
                    <Input className="h-8 text-xs" placeholder="https://..." value={f.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Company Name</Label><Input value={f.company_name || ""} onChange={(e) => set("company_name", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Address</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Label>Street Address</Label><Input value={f.street_address || ""} onChange={(e) => set("street_address", e.target.value)} placeholder="123 Main Street" /></div>
              <div><Label>Unit / Suite / PO Box</Label><Input value={f.unit_or_po_box || ""} onChange={(e) => set("unit_or_po_box", e.target.value)} placeholder="Suite 200 or PO Box 45" /></div>
              <div><Label>City / Town</Label><Input value={f.city || ""} onChange={(e) => set("city", e.target.value)} placeholder="Toronto" /></div>
              <div><Label>Province / State</Label><Input value={f.province || ""} onChange={(e) => set("province", e.target.value)} placeholder="Ontario" /></div>
              <div><Label>Postal / Zip Code</Label><Input value={f.postal_code || ""} onChange={(e) => set("postal_code", e.target.value)} placeholder="A1B 2C3" /></div>
              <div className="sm:col-span-2"><Label>Country</Label><Input value={f.country || "Canada"} onChange={(e) => set("country", e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Business Hours</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const bh = getBusinessHours();
                  const dayData = bh[day] || { open: "08:00", close: "17:00", closed: false };
                  return (
                    <div key={day} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="w-24 font-medium text-sm">{day}</div>
                      <Switch checked={!dayData.closed} onCheckedChange={(v) => setBusinessHour(day, "closed", !v)} />
                      {!dayData.closed ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Input type="time" className="h-8 w-28" value={dayData.open} onChange={(e) => setBusinessHour(day, "open", e.target.value)} />
                          <span className="text-muted-foreground">to</span>
                          <Input type="time" className="h-8 w-28" value={dayData.close} onChange={(e) => setBusinessHour(day, "close", e.target.value)} />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── FINANCIAL TAB ─── */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Tax & Currency</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Default Tax Rate (%)</Label><Input type="number" value={f.default_tax_rate ?? 0} onChange={(e) => set("default_tax_rate", Number(e.target.value))} /></div>
              <div>
                <Label>Currency</Label>
                <Select value={f.currency || "CAD"} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENCY_MAP).map(([code, { label }]) => (
                      <SelectItem key={code} value={code}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Travel Rate ({f.currency_symbol || "$"}/km)</Label><Input type="number" step="0.01" value={f.travel_rate_per_km ?? 0} onChange={(e) => set("travel_rate_per_km", Number(e.target.value))} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Deposits</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 pt-2"><Switch checked={f.require_deposit ?? false} onCheckedChange={(v) => set("require_deposit", v)} /><Label>Require Deposit on Quotes</Label></div>
              <div><Label>Deposit Percentage (%)</Label><Input type="number" value={f.deposit_percentage ?? 25} onChange={(e) => set("deposit_percentage", Number(e.target.value))} disabled={!f.require_deposit} /></div>
              <div className="sm:col-span-2"><Label>Default Invoice Terms</Label><Textarea value={f.default_invoice_terms || ""} onChange={(e) => set("default_invoice_terms", e.target.value)} rows={3} placeholder="Net 30, payment due within 30 days of invoice date..." /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── RATES TAB ─── */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Shop & Labour Rates</CardTitle>
              <Button size="sm" onClick={() => openRateDialog()}><Plus className="h-4 w-4 mr-1" />Add Rate</Button>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <p className="text-muted-foreground text-center py-4">Loading rates...</p>
              ) : labourRates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No labour rates configured. Add your first rate to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rate ($/hr)</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labourRates.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>${Number(r.rate).toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.description || "—"}</TableCell>
                        <TableCell>{r.is_default ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span> : "—"}</TableCell>
                        <TableCell>{r.is_active ? <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Active</span> : <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openRateDialog(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this rate?")) deleteRateMutation.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DOCUMENTS TAB ─── */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Document Numbering</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><Label>Quote Prefix</Label><Input value={f.quote_prefix || ""} onChange={(e) => set("quote_prefix", e.target.value)} /></div>
                <div><Label>Invoice Prefix</Label><Input value={f.invoice_prefix || ""} onChange={(e) => set("invoice_prefix", e.target.value)} /></div>
                <div><Label>PO Prefix</Label><Input value={f.po_prefix || ""} onChange={(e) => set("po_prefix", e.target.value)} /></div>
                <div><Label>Zero Padding</Label><Input type="number" value={f.number_padding ?? 4} onChange={(e) => set("number_padding", Number(e.target.value))} /></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={f.include_year ?? false} onCheckedChange={(v) => set("include_year", v)} /><Label>Include Year</Label></div>
                {f.include_year && (
                  <Select value={f.year_format || "full"} onValueChange={(v) => set("year_format", v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="full">2024</SelectItem><SelectItem value="short">24</SelectItem></SelectContent>
                  </Select>
                )}
              </div>
              <div className="bg-muted rounded-md p-4 text-sm space-y-1.5">
                <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                <p><span className="font-medium">Next Quote:</span> {previewNumber(f.quote_prefix || "QUO-", f.quote_next_number || 1, f.number_padding || 4, f.include_year || false, f.year_format || "full")}</p>
                <p><span className="font-medium">Next Invoice:</span> {previewNumber(f.invoice_prefix || "INV-", f.invoice_next_number || 1, f.number_padding || 4, f.include_year || false, f.year_format || "full")}</p>
                <p><span className="font-medium">Next PO:</span> {previewNumber(f.po_prefix || "PO-", f.po_next_number || 1, f.number_padding || 4, f.include_year || false, f.year_format || "full")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── MOBILE TAB ─── */}
        <TabsContent value="mobile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mobile Quick Links</CardTitle>
              <p className="text-sm text-muted-foreground">Select up to 5 links for the mobile bottom bar</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {weldingAdminLinks.filter(l => l.label !== "Overview").map((link) => (
                  <label key={link.label} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer">
                    <Checkbox checked={(f.mobile_quick_links || []).includes(link.label)} onCheckedChange={() => toggleQuickLink(link.label)} />
                    <link.icon className="h-4 w-4" /><span className="text-sm">{link.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── NOTIFICATIONS TAB ─── */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Notification Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive email alerts for new quotes, invoices, and payments</p>
                </div>
                <Switch checked={f.enable_email_notifications ?? false} onCheckedChange={(v) => set("enable_email_notifications", v)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">Customer Portal</p>
                  <p className="text-xs text-muted-foreground">Allow customers to view quotes and invoices online</p>
                </div>
                <Switch checked={f.enable_customer_portal ?? true} onCheckedChange={(v) => set("enable_customer_portal", v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Labour Rate Dialog */}
      <Dialog open={rateDialog} onOpenChange={setRateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Rate" : "Add Labour Rate"}</DialogTitle>
            <DialogDescription>Configure a shop or labour rate for quotes and invoices.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Rate Name</Label><Input value={rateForm.name} onChange={(e) => setRateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Standard Welding, TIG Premium" /></div>
            <div><Label>Hourly Rate ($)</Label><Input type="number" step="0.01" value={rateForm.rate} onChange={(e) => setRateForm(p => ({ ...p, rate: Number(e.target.value) }))} /></div>
            <div><Label>Description</Label><Textarea value={rateForm.description} onChange={(e) => setRateForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Optional description..." /></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={rateForm.is_default} onCheckedChange={(v) => setRateForm(p => ({ ...p, is_default: v }))} /><Label>Default Rate</Label></div>
              <div className="flex items-center gap-2"><Switch checked={rateForm.is_active} onCheckedChange={(v) => setRateForm(p => ({ ...p, is_active: v }))} /><Label>Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateDialog(false)}>Cancel</Button>
            <Button onClick={() => saveRateMutation.mutate(rateForm)} disabled={saveRateMutation.isPending || !rateForm.name}>
              {saveRateMutation.isPending ? "Saving..." : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WeldingAdminLayout>
  );
};

export default WeldingAdminSettings;
