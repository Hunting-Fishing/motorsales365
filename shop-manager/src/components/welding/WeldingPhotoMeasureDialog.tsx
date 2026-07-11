import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Camera, Upload, Sparkles, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWeldingSettings } from "@/contexts/WeldingSettingsContext";

interface ProposedMaterial {
  name: string;
  category?: string;
  shape?: string;
  material_grade?: string;
  quantity: number;
  estimated_cost_each: number;
  estimated_sell_each: number;
  measurements: string;
  notes?: string;
  _selected?: boolean;
}

interface AIResult {
  project_description: string;
  confidence: number;
  waste_percent?: number;
  estimated_labour_hours?: number;
  dimensions_summary?: string;
  assumptions: string[];
  materials: ProposedMaterial[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (payload: {
    materials: Array<{ name: string; category: string; quantity: number; cost_price: number; sell_price: number; measurements: string; notes: string }>;
    description?: string;
    labour_hours?: number;
  }) => void;
}

const MAX_DIM = 1600;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  const ratio = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas error");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function WeldingPhotoMeasureDialog({ open, onOpenChange, onApply }: Props) {
  const { formatCurrency } = useWeldingSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [markup, setMarkup] = useState(1.4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);

  const reset = () => { setImageUrl(null); setResult(null); setHint(""); };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setImageUrl(dataUrl);
      setResult(null);
    } catch (e) {
      toast.error("Failed to read image");
    }
  };

  const analyze = async () => {
    if (!imageUrl) { toast.error("Upload a photo first"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("welding-photo-measure", {
        body: { image_data_url: imageUrl, hint, markup_multiplier: markup },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as AIResult;
      r.materials = r.materials.map((m) => ({ ...m, _selected: true }));
      setResult(r);
      toast.success(`AI extracted ${r.materials.length} material line items`);
    } catch (e: any) {
      const msg = e?.message || "Analysis failed";
      if (msg.includes("rate limit")) toast.error("AI is rate limited. Please wait a moment.");
      else if (msg.includes("credits")) toast.error("AI credits exhausted. Add credits in Settings.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMaterial = (i: number) => {
    if (!result) return;
    const next = [...result.materials];
    next[i] = { ...next[i], _selected: !next[i]._selected };
    setResult({ ...result, materials: next });
  };

  const updateField = (i: number, field: keyof ProposedMaterial, value: any) => {
    if (!result) return;
    const next = [...result.materials];
    (next[i] as any)[field] = value;
    setResult({ ...result, materials: next });
  };

  const apply = () => {
    if (!result) return;
    const selected = result.materials.filter((m) => m._selected);
    if (selected.length === 0) { toast.error("Select at least one material"); return; }
    onApply({
      description: result.project_description,
      labour_hours: result.estimated_labour_hours,
      materials: selected.map((m) => ({
        name: m.name,
        category: m.category || "",
        quantity: Number(m.quantity) || 1,
        cost_price: Number(m.estimated_cost_each) || 0,
        sell_price: Number(m.estimated_sell_each) || 0,
        measurements: m.measurements || "",
        notes: m.notes || "",
      })),
    });
    onOpenChange(false);
    reset();
  };

  const fmt = (n: number) => formatCurrency ? formatCurrency(n || 0) : `$${(n || 0).toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Photo Measure
          </DialogTitle>
          <DialogDescription>
            Upload a sketch or site photo. AI extracts measurements and proposes quote line items.
          </DialogDescription>
        </DialogHeader>

        {!imageUrl && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => cameraRef.current?.click()}>
              <CardContent className="p-6 flex flex-col items-center justify-center gap-2 text-center">
                <Camera className="h-8 w-8 text-primary" />
                <div className="font-medium">Take Photo</div>
                <div className="text-xs text-muted-foreground">Use device camera</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => fileRef.current?.click()}>
              <CardContent className="p-6 flex flex-col items-center justify-center gap-2 text-center">
                <Upload className="h-8 w-8 text-primary" />
                <div className="font-medium">Upload Image</div>
                <div className="text-xs text-muted-foreground">Photo or sketch</div>
              </CardContent>
            </Card>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0] || null)} />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0] || null)} />
          </div>
        )}

        {imageUrl && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border bg-muted">
              <img src={imageUrl} alt="Project" className="w-full max-h-72 object-contain" />
              <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={reset}>
                <X className="h-3 w-3 mr-1" />Change
              </Button>
            </div>

            {!result && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <Label>Hint (optional)</Label>
                    <Input placeholder="e.g. 6ft tall driveway gate, 12ft wide" value={hint} onChange={(e) => setHint(e.target.value)} />
                  </div>
                  <div>
                    <Label>Markup ×</Label>
                    <Input type="number" step="0.1" min="1" value={markup} onChange={(e) => setMarkup(Number(e.target.value) || 1.4)} />
                  </div>
                </div>
                <Button onClick={analyze} disabled={loading} className="w-full">
                  {loading ? (<><LoadingSpinner size="sm" className="mr-2" />Analyzing photo…</>) : (<><Sparkles className="h-4 w-4 mr-2" />Analyze with AI</>)}
                </Button>
              </>
            )}

            {result && (
              <div className="space-y-3">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold">{result.project_description}</div>
                        {result.dimensions_summary && (
                          <div className="text-sm text-muted-foreground mt-1">{result.dimensions_summary}</div>
                        )}
                      </div>
                      <Badge variant={result.confidence >= 0.7 ? "default" : "secondary"}>
                        {Math.round(result.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t">
                      {result.estimated_labour_hours != null && <span>Labour: ~{result.estimated_labour_hours}h</span>}
                      {result.waste_percent != null && <span>Waste: {result.waste_percent}%</span>}
                    </div>
                    {result.assumptions?.length > 0 && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        <div className="font-medium mb-1">Assumptions:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {result.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Proposed Materials ({result.materials.filter(m => m._selected).length}/{result.materials.length})</Label>
                    <Button size="sm" variant="ghost" onClick={analyze} disabled={loading}>
                      <RefreshCw className="h-3 w-3 mr-1" />Re-analyze
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {result.materials.map((m, i) => (
                      <Card key={i} className={m._selected ? "border-primary" : "opacity-60"}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <Button size="icon" variant={m._selected ? "default" : "outline"} className="h-7 w-7 shrink-0" onClick={() => toggleMaterial(i)}>
                              {m._selected ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </Button>
                            <div className="flex-1 grid grid-cols-12 gap-2">
                              <div className="col-span-12 md:col-span-5">
                                <Input value={m.name} onChange={(e) => updateField(i, "name", e.target.value)} className="h-8 text-sm font-medium" />
                                <div className="text-xs text-muted-foreground mt-1">{m.measurements}</div>
                                {m.material_grade && <Badge variant="outline" className="mt-1 text-xs">{m.material_grade}</Badge>}
                              </div>
                              <div className="col-span-3 md:col-span-2">
                                <Label className="text-xs">Qty</Label>
                                <Input type="number" value={m.quantity} onChange={(e) => updateField(i, "quantity", Number(e.target.value))} className="h-8" />
                              </div>
                              <div className="col-span-4 md:col-span-2">
                                <Label className="text-xs">Cost</Label>
                                <Input type="number" step="0.01" value={m.estimated_cost_each} onChange={(e) => updateField(i, "estimated_cost_each", Number(e.target.value))} className="h-8" />
                              </div>
                              <div className="col-span-5 md:col-span-3">
                                <Label className="text-xs">Sell</Label>
                                <Input type="number" step="0.01" value={m.estimated_sell_each} onChange={(e) => updateField(i, "estimated_sell_each", Number(e.target.value))} className="h-8" />
                                <div className="text-xs text-muted-foreground text-right mt-1">
                                  Line: {fmt(m.quantity * m.estimated_sell_each)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t sticky bottom-0 bg-background">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Selected total: </span>
                    <span className="font-semibold">
                      {fmt(result.materials.filter(m => m._selected).reduce((t, m) => t + m.quantity * m.estimated_sell_each, 0))}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={apply}>
                      <Check className="h-4 w-4 mr-2" />Apply to Quote
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
