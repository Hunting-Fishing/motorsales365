import { useState } from "react";
import { 
  useFuelDeliveryProducts, 
  useUpdateFuelDeliveryProduct,
  useFuelDeliveryPriceHistory,
  useCreateFuelDeliveryPriceHistory
} from "@/hooks/useFuelDelivery";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, TrendingUp, TrendingDown, History, 
  Settings, Zap, Bell, ArrowUpRight, ArrowDownRight,
  Fuel, AlertTriangle
} from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function FuelDeliveryPricing() {
  const { data: products } = useFuelDeliveryProducts();
  const updateProduct = useUpdateFuelDeliveryProduct();
  const { data: priceHistory } = useFuelDeliveryPriceHistory();
  const createPriceHistory = useCreateFuelDeliveryPriceHistory();
  
  const [priceUpdateDialog, setPriceUpdateDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newPrice, setNewPrice] = useState("");
  const [priceChangeReason, setPriceChangeReason] = useState("");
  const [automationSettings, setAutomationSettings] = useState({
    autoAdjust: false,
    marginPercent: 15,
    alertThreshold: 5,
    roundToNearest: 0.05
  });

  const handleUpdatePrice = async () => {
    if (!selectedProduct || !newPrice) {
      toast.error("Please enter a new price");
      return;
    }

    const oldPrice = selectedProduct.base_price_per_unit || 0;
    const priceNum = parseFloat(newPrice);
    const changePercent = oldPrice > 0 ? ((priceNum - oldPrice) / oldPrice) * 100 : 0;

    // Create price history record
    await createPriceHistory.mutateAsync({
      product_id: selectedProduct.id,
      old_price: oldPrice,
      new_price: priceNum,
      change_reason: priceChangeReason || 'Manual price update'
    });

    // Update product price
    await updateProduct.mutateAsync({
      id: selectedProduct.id,
      base_price_per_unit: priceNum
    });

    toast.success(`Price updated: ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`);
    setPriceUpdateDialog(false);
    setSelectedProduct(null);
    setNewPrice("");
    setPriceChangeReason("");
  };

  // Prepare chart data from price history
  const getChartData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return {
        date: format(date, 'MMM d'),
        dateKey: format(date, 'yyyy-MM-dd')
      };
    });

    return last30Days.map(day => {
      const dayData: any = { date: day.date };
      
      products?.forEach(product => {
        const historyForDay = priceHistory
          ?.filter(h => 
            h.product_id === product.id && 
            format(new Date(h.effective_date), 'yyyy-MM-dd') <= day.dateKey
          )
          .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
        
        dayData[product.product_name] = historyForDay?.new_price || product.base_price_per_unit;
      });

      return dayData;
    });
  };

  const chartData = getChartData();
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            Fuel Pricing
          </h1>
          <p className="text-muted-foreground">Manage prices and view pricing history</p>
        </div>
      </div>

      {/* Current Prices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {products?.map((product) => {
          const recentHistory = priceHistory
            ?.filter(h => h.product_id === product.id)
            .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
          
          const currentPrice = product.base_price_per_unit || 0;
          const priceChange = recentHistory && recentHistory.old_price > 0
            ? ((currentPrice - recentHistory.old_price) / recentHistory.old_price) * 100
            : 0;

          return (
            <Card key={product.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {product.product_name}
                  </CardTitle>
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold">
                      ${currentPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">per gallon</div>
                  </div>
                  {priceChange !== 0 && (
                    <Badge 
                      variant="outline" 
                      className={priceChange > 0 ? 'text-red-500 border-red-500/30' : 'text-green-500 border-green-500/30'}
                    >
                      {priceChange > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {Math.abs(priceChange).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={() => {
                    setSelectedProduct(product);
                    setNewPrice(currentPrice.toString());
                    setPriceUpdateDialog(true);
                  }}
                >
                  Update Price
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Price History
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Price Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Price Trends (Last 30 Days)</CardTitle>
              <CardDescription>Track price changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`$${value?.toFixed(2)}`, '']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    {products?.map((product, index) => (
                      <Line
                        key={product.id}
                        type="monotone"
                        dataKey={product.product_name}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent Price Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Old Price</TableHead>
                    <TableHead>New Price</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory?.slice(0, 20).map((record) => {
                    const product = products?.find(p => p.id === record.product_id);
                    const changePercent = record.old_price > 0 
                      ? ((record.new_price - record.old_price) / record.old_price) * 100 
                      : 0;
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.effective_date), 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell className="font-medium">{product?.product_name || 'Unknown'}</TableCell>
                        <TableCell>${record.old_price?.toFixed(2)}</TableCell>
                        <TableCell>${record.new_price?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={changePercent > 0 ? 'text-red-500' : 'text-green-500'}>
                            {changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.change_reason || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(!priceHistory || priceHistory.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No price history records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Pricing Automation
              </CardTitle>
              <CardDescription>
                Configure automatic price adjustments based on market conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Adjust Prices</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically adjust prices based on cost changes
                  </p>
                </div>
                <Switch 
                  checked={automationSettings.autoAdjust}
                  onCheckedChange={(checked) => setAutomationSettings({ ...automationSettings, autoAdjust: checked })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Target Margin (%)</Label>
                  <Input
                    type="number"
                    value={automationSettings.marginPercent}
                    onChange={(e) => setAutomationSettings({ ...automationSettings, marginPercent: parseFloat(e.target.value) })}
                    placeholder="15"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maintain this profit margin
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Alert Threshold (%)</Label>
                  <Input
                    type="number"
                    value={automationSettings.alertThreshold}
                    onChange={(e) => setAutomationSettings({ ...automationSettings, alertThreshold: parseFloat(e.target.value) })}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when price changes exceed this
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Round to Nearest</Label>
                  <Select 
                    value={automationSettings.roundToNearest.toString()}
                    onValueChange={(value) => setAutomationSettings({ ...automationSettings, roundToNearest: parseFloat(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">$0.01</SelectItem>
                      <SelectItem value="0.05">$0.05</SelectItem>
                      <SelectItem value="0.10">$0.10</SelectItem>
                      <SelectItem value="0.25">$0.25</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Round prices to nearest value
                  </p>
                </div>
              </div>

              <Button 
                className="w-full md:w-auto"
                onClick={() => toast.success("Automation settings saved")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Save Automation Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Price Alerts
              </CardTitle>
              <CardDescription>
                Get notified about significant price changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg flex items-start gap-4">
                  <div className="p-2 rounded-full bg-yellow-500/10">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">No active alerts</h4>
                    <p className="text-sm text-muted-foreground">
                      Price alerts will appear here when thresholds are triggered
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">Configure Alert Rules</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Alert when price increases by</Label>
                      <div className="flex gap-2">
                        <Input type="number" placeholder="5" className="w-24" />
                        <span className="flex items-center text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Alert when price decreases by</Label>
                      <div className="flex gap-2">
                        <Input type="number" placeholder="5" className="w-24" />
                        <span className="flex items-center text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => toast.success("Alert rules saved")}>
                    Save Alert Rules
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Price Update Dialog */}
      <Dialog open={priceUpdateDialog} onOpenChange={setPriceUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Price - {selectedProduct?.product_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Current Price</div>
              <div className="text-2xl font-bold">${selectedProduct?.base_price_per_unit?.toFixed(2) || '0.00'}/gal</div>
            </div>

            <div className="space-y-2">
              <Label>New Price ($/gallon) *</Label>
              <Input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
              />
              {newPrice && selectedProduct?.base_price_per_unit && (
                <p className="text-sm text-muted-foreground">
                  Change: {((parseFloat(newPrice) - selectedProduct.base_price_per_unit) / selectedProduct.base_price_per_unit * 100).toFixed(2)}%
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reason for Change</Label>
              <Select value={priceChangeReason} onValueChange={setPriceChangeReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Market adjustment">Market adjustment</SelectItem>
                  <SelectItem value="Cost increase">Cost increase</SelectItem>
                  <SelectItem value="Cost decrease">Cost decrease</SelectItem>
                  <SelectItem value="Seasonal adjustment">Seasonal adjustment</SelectItem>
                  <SelectItem value="Competitive pricing">Competitive pricing</SelectItem>
                  <SelectItem value="Promotional pricing">Promotional pricing</SelectItem>
                  <SelectItem value="Manual correction">Manual correction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceUpdateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePrice} disabled={createPriceHistory.isPending}>
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
