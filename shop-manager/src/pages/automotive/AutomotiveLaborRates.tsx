import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AutomotiveLaborRates() {
  const [rates, setRates] = React.useState({
    standard: 95,
    diagnostic: 125,
    warranty: 75,
    internal: 50,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            Labor Rates
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage hourly labor rates for different service types
          </p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Standard Labor</CardTitle>
            <CardDescription>General repair work</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">$</span>
              <Input
                type="number"
                value={rates.standard}
                onChange={(e) => setRates({ ...rates, standard: Number(e.target.value) })}
                className="text-2xl font-bold"
              />
              <span className="text-muted-foreground">/hr</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Diagnostic Labor</CardTitle>
            <CardDescription>Troubleshooting & diagnosis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">$</span>
              <Input
                type="number"
                value={rates.diagnostic}
                onChange={(e) => setRates({ ...rates, diagnostic: Number(e.target.value) })}
                className="text-2xl font-bold"
              />
              <span className="text-muted-foreground">/hr</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Warranty Labor</CardTitle>
            <CardDescription>Warranty claim rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">$</span>
              <Input
                type="number"
                value={rates.warranty}
                onChange={(e) => setRates({ ...rates, warranty: Number(e.target.value) })}
                className="text-2xl font-bold"
              />
              <span className="text-muted-foreground">/hr</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Internal Labor</CardTitle>
            <CardDescription>Shop vehicle maintenance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">$</span>
              <Input
                type="number"
                value={rates.internal}
                onChange={(e) => setRates({ ...rates, internal: Number(e.target.value) })}
                className="text-2xl font-bold"
              />
              <span className="text-muted-foreground">/hr</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Labor Rate Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(rates).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="capitalize">{key} Rate</span>
                <Badge variant="outline" className="font-mono text-lg">
                  ${value.toFixed(2)}/hr
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
