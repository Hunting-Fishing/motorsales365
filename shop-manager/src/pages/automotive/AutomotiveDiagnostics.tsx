import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Activity, Search, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COMMON_CODES = [
  { code: 'P0300', description: 'Random/Multiple Cylinder Misfire Detected', severity: 'high' },
  { code: 'P0171', description: 'System Too Lean (Bank 1)', severity: 'medium' },
  { code: 'P0420', description: 'Catalyst System Efficiency Below Threshold', severity: 'medium' },
  { code: 'P0442', description: 'Evaporative Emission Control System Leak Detected (Small Leak)', severity: 'low' },
  { code: 'P0455', description: 'Evaporative Emission Control System Leak Detected (Large Leak)', severity: 'medium' },
  { code: 'P0128', description: 'Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature)', severity: 'low' },
];

export default function AutomotiveDiagnostics() {
  const [searchCode, setSearchCode] = React.useState('');
  const [selectedCode, setSelectedCode] = React.useState<typeof COMMON_CODES[0] | null>(null);

  const filteredCodes = React.useMemo(() => {
    if (!searchCode) return COMMON_CODES;
    const term = searchCode.toLowerCase();
    return COMMON_CODES.filter(c => 
      c.code.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term)
    );
  }, [searchCode]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Diagnostics Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            OBD-II code lookup and diagnostic tools
          </p>
        </div>
      </div>

      <Tabs defaultValue="lookup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lookup">Code Lookup</TabsTrigger>
          <TabsTrigger value="scanner">Scanner Integration</TabsTrigger>
          <TabsTrigger value="history">Diagnostic History</TabsTrigger>
        </TabsList>

        <TabsContent value="lookup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OBD-II Code Lookup</CardTitle>
              <CardDescription>Search for diagnostic trouble codes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter code (e.g., P0300) or search by description..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2">
                {filteredCodes.map((code) => (
                  <div
                    key={code.code}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCode(code)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={getSeverityColor(code.severity) as any}>
                        {code.code}
                      </Badge>
                      <span className="text-sm">{code.description}</span>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {code.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedCode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {selectedCode.code} Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-medium">{selectedCode.description}</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Common Causes</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Faulty sensor</li>
                      <li>• Wiring issues</li>
                      <li>• Component failure</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Symptoms</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Check engine light</li>
                      <li>• Reduced performance</li>
                      <li>• Poor fuel economy</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Repair Difficulty</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`w-4 h-4 rounded ${i <= 3 ? 'bg-primary' : 'bg-muted'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">Moderate</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full">Create Work Order for This Code</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scanner" className="space-y-4">
          <Card className="p-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Scanner Integration Coming Soon</h3>
            <p className="text-muted-foreground mb-4">
              Connect your OBD-II scanner to read codes directly from vehicles
            </p>
            <Button variant="outline">Learn More</Button>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Diagnostics</CardTitle>
              <CardDescription>Codes scanned and diagnosed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { vehicle: '2019 Ford F-150', code: 'P0300', date: 'Today', status: 'resolved' },
                  { vehicle: '2021 Toyota Camry', code: 'P0171', date: 'Yesterday', status: 'pending' },
                  { vehicle: '2018 Honda Civic', code: 'P0420', date: '3 days ago', status: 'resolved' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.vehicle}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{item.code}</Badge>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                    <Badge variant={item.status === 'resolved' ? 'default' : 'secondary'}>
                      {item.status === 'resolved' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Resolved</>
                      ) : (
                        'Pending'
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
