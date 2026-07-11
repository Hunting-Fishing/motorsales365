import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSafetyDocuments } from '@/hooks/useSafetyDocuments';
import { SafetyDocumentUpload } from '@/components/safety/SafetyDocumentUpload';
import { FileText, Plus, Search, ExternalLink, AlertTriangle, Wrench, Zap, ArrowUpFromLine } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SafetyDocuments() {
  const { loading, documents, searchSDS, getByType, getExpiringDocuments } = useSafetyDocuments();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sdsDocuments = getByType('sds');
  const policies = getByType('policy');
  const procedures = getByType('procedure');
  const torqueSpecs = documents.filter(d => d.document_type === 'torque_spec');
  const wiringDiagrams = documents.filter(d => d.document_type === 'wiring_diagram');
  const evSafetyDocs = documents.filter(d => d.document_type === 'ev_safety');
  const heightSafetyDocs = documents.filter(d => d.document_type === 'working_at_height');
  const expiringDocs = getExpiringDocuments(30);
  
  const technicalDocs = [...torqueSpecs, ...wiringDiagrams];
  const filteredSDS = searchQuery ? searchSDS(searchQuery) : sdsDocuments;

  return (
    <>
      <Helmet>
        <title>Safety Documents | Safety</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Safety Document Library
            </h1>
            <p className="text-muted-foreground mt-1">SDS sheets, technical specs, EV safety, and more</p>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {expiringDocs.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                {expiringDocs.length} Documents Expiring Soon
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        <Tabs defaultValue="sds">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="sds">SDS Sheets ({sdsDocuments.length})</TabsTrigger>
            <TabsTrigger value="technical" className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Technical ({technicalDocs.length})
            </TabsTrigger>
            <TabsTrigger value="ev" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              EV Safety ({evSafetyDocs.length})
            </TabsTrigger>
            <TabsTrigger value="height" className="flex items-center gap-1">
              <ArrowUpFromLine className="h-3 w-3" />
              Height Safety ({heightSafetyDocs.length})
            </TabsTrigger>
            <TabsTrigger value="policies">Policies ({policies.length})</TabsTrigger>
            <TabsTrigger value="procedures">Procedures ({procedures.length})</TabsTrigger>
            <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sds" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SDS by chemical name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (
              <div className="grid gap-3">
                {filteredSDS.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No SDS documents found. Upload your first Safety Data Sheet.
                    </CardContent>
                  </Card>
                ) : filteredSDS.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.chemical_name} • {doc.manufacturer}
                        </p>
                        {doc.hazard_classification?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {doc.hazard_classification.map(h => (
                              <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Technical Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Torque specs, wiring diagrams, and technical reference documents
                </p>
                <div className="grid gap-3">
                  {technicalDocs.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">
                      No technical documents uploaded yet
                    </p>
                  ) : technicalDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {doc.document_type === 'torque_spec' ? 'Torque Spec' : 'Wiring Diagram'}
                          </Badge>
                          {doc.description && (
                            <span className="text-xs text-muted-foreground">{doc.description}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ev" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  EV Safety Procedures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Electric vehicle safety procedures, high-voltage handling, and battery protocols
                </p>
                <div className="grid gap-3">
                  {evSafetyDocs.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">
                      No EV safety documents uploaded yet
                    </p>
                  ) : evSafetyDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="height" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                  Working at Height Safety
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Procedures for working at height, ladder safety, and fall protection
                </p>
                <div className="grid gap-3">
                  {heightSafetyDocs.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">
                      No height safety documents uploaded yet
                    </p>
                  ) : heightSafetyDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <div className="grid gap-3">
              {policies.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No policy documents found
                  </CardContent>
                </Card>
              ) : policies.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="procedures">
            <div className="grid gap-3">
              {procedures.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No procedure documents found
                  </CardContent>
                </Card>
              ) : procedures.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">{doc.document_type}</p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SafetyDocumentUpload open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
}
