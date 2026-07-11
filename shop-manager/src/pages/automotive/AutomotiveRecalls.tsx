import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileSearch,
  Search,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Car,
  Loader2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAutomotiveRegion } from '@/hooks/useAutomotiveRegion';
import { REGION_META } from '@/lib/regions/automotive';
import { RegionSwitcher } from '@/components/automotive/RegionSwitcher';
import { toast } from 'sonner';

interface Recall {
  id: string;
  source_id: string;
  source_agency: string;
  title: string;
  affected_makes: string[];
  affected_models: string[];
  year_from: number | null;
  year_to: number | null;
  issued_at: string | null;
  remedy: string | null;
  source_url: string | null;
}

interface TSB {
  id: string;
  bulletin_no: string;
  manufacturer: string;
  title: string;
  affected_makes: string[];
  affected_models: string[];
  year_from: number | null;
  year_to: number | null;
  issued_at: string | null;
  severity: string;
  source_url: string | null;
}

function affectedLabel(makes: string[], models: string[], y1: number | null, y2: number | null) {
  const yr = y1 && y2 ? `${y1}-${y2}` : y1 ? `${y1}+` : '';
  const m = [...makes, ...models].filter(Boolean).join(' ');
  return [yr, m].filter(Boolean).join(' ');
}

export default function AutomotiveRecalls() {
  const { region } = useAutomotiveRegion();
  const meta = REGION_META[region];
  const [vinSearch, setVinSearch] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [vinLoading, setVinLoading] = React.useState(false);
  const [vinResult, setVinResult] = React.useState<string | null>(null);

  const recallsQ = useQuery({
    queryKey: ['auto_recalls', region],
    queryFn: async (): Promise<Recall[]> => {
      const { data, error } = await (supabase as any)
        .from('auto_recalls')
        .select('*')
        .eq('region', region)
        .order('issued_at', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const tsbsQ = useQuery({
    queryKey: ['auto_tsbs', region],
    queryFn: async (): Promise<TSB[]> => {
      const { data, error } = await (supabase as any)
        .from('auto_tsbs')
        .select('*')
        .eq('region', region)
        .order('issued_at', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredRecalls = (recallsQ.data ?? []).filter((r) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      r.title.toLowerCase().includes(q) ||
      r.source_id.toLowerCase().includes(q) ||
      affectedLabel(r.affected_makes, r.affected_models, r.year_from, r.year_to)
        .toLowerCase()
        .includes(q)
    );
  });

  const filteredTSBs = (tsbsQ.data ?? []).filter((t) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.bulletin_no.toLowerCase().includes(q) ||
      t.manufacturer.toLowerCase().includes(q)
    );
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleVinLookup = async () => {
    if (vinSearch.length !== 17) {
      toast.error('VIN must be exactly 17 characters');
      return;
    }
    setVinLoading(true);
    setVinResult(null);
    try {
      // NHTSA vPIC is free, keyless, and decodes most global VINs (incl. ASEAN imports)
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vinSearch)}?format=json`,
      );
      const json = await res.json();
      const r = json?.Results?.[0];
      if (!r) {
        toast.error('No decode result');
        return;
      }
      const label = [r.ModelYear, r.Make, r.Model, r.Trim].filter(Boolean).join(' ');
      setVinResult(label || 'Decoded, but no make/model returned');
      // auto-filter list by decoded make
      if (r.Make) setSearchTerm(r.Make);
    } catch (e) {
      console.error(e);
      toast.error('VIN decode failed');
    } finally {
      setVinLoading(false);
    }
  };

  const isEmpty =
    !recallsQ.isLoading &&
    !tsbsQ.isLoading &&
    (recallsQ.data?.length ?? 0) === 0 &&
    (tsbsQ.data?.length ?? 0) === 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSearch className="h-8 w-8 text-primary" />
            TSB & Recalls
          </h1>
          <p className="text-muted-foreground mt-1">
            Technical Service Bulletins and Safety Recalls — {meta.flag} {meta.label}
          </p>
        </div>
        <RegionSwitcher />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>VIN Lookup</CardTitle>
          <CardDescription>
            Decode a 17-character VIN via NHTSA vPIC (works for most global VINs, including
            ASEAN-market imports).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter 17-character VIN..."
              value={vinSearch}
              onChange={(e) => setVinSearch(e.target.value.toUpperCase())}
              className="font-mono"
              maxLength={17}
            />
            <Button onClick={handleVinLookup} disabled={vinLoading}>
              {vinLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Decode VIN
            </Button>
          </div>
          {vinResult && (
            <p className="text-sm text-muted-foreground">
              Decoded: <span className="font-medium text-foreground">{vinResult}</span> — list
              filtered to matching make.
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="recalls" className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="recalls">
              Recalls {recallsQ.data ? `(${recallsQ.data.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="tsb">
              Technical Bulletins {tsbsQ.data ? `(${tsbsQ.data.length})` : ''}
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="recalls" className="space-y-4">
          {recallsQ.isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading recalls…
            </div>
          )}
          {!recallsQ.isLoading && filteredRecalls.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No recalls indexed for {meta.label} yet. The sync job will populate from{' '}
                {meta.agencies.join(', ')}.
              </CardContent>
            </Card>
          )}
          {filteredRecalls.map((recall) => (
            <Card key={recall.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Safety Recall
                      </Badge>
                      <Badge variant="outline">{recall.source_id}</Badge>
                      <Badge variant="secondary">{recall.source_agency}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold">{recall.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        {affectedLabel(
                          recall.affected_makes,
                          recall.affected_models,
                          recall.year_from,
                          recall.year_to,
                        ) || '—'}
                      </span>
                      {recall.issued_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {recall.issued_at}
                        </span>
                      )}
                    </div>
                    {recall.remedy && (
                      <p className="text-sm">
                        <strong>Remedy:</strong> {recall.remedy}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {recall.source_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={recall.source_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Source
                        </a>
                      </Button>
                    )}
                    <Button size="sm">Create Work Order</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tsb" className="space-y-4">
          {tsbsQ.isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading TSBs…
            </div>
          )}
          {!tsbsQ.isLoading && filteredTSBs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No TSBs recorded for {meta.label} yet. Submit shop knowledge via the admin form to
                build the regional library.
              </CardContent>
            </Card>
          )}
          {filteredTSBs.map((tsb) => (
            <Card key={tsb.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getSeverityColor(tsb.severity) as any}>
                        {tsb.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{tsb.bulletin_no}</Badge>
                      <Badge variant="secondary">{tsb.manufacturer}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold">{tsb.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        {affectedLabel(
                          tsb.affected_makes,
                          tsb.affected_models,
                          tsb.year_from,
                          tsb.year_to,
                        ) || '—'}
                      </span>
                      {tsb.issued_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {tsb.issued_at}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {tsb.source_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={tsb.source_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </a>
                      </Button>
                    )}
                    <Button size="sm">Create Work Order</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <div className="space-y-1 text-sm">
              <h4 className="font-semibold text-base">Region: {meta.label}</h4>
              <p className="text-muted-foreground">
                <strong>Sources:</strong> {meta.agencies.join(' · ')}
              </p>
              <p className="text-muted-foreground">
                <strong>Emissions standard:</strong> {meta.emissions}
              </p>
              <p className="text-muted-foreground">
                <strong>OBD mandate:</strong> {meta.obdMandate}
              </p>
              <p className="text-muted-foreground pt-1">
                Generic SAE J2012 DTCs (P0/B0/C0/U0) are globally identical. Manufacturer-specific
                codes (P1, B1/B2, C1/C2, U1/U2) and emissions readiness monitors vary by regional
                ECU calibration — diagnostics will filter accordingly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {isEmpty && null}
    </div>
  );
}
