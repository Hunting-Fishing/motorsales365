
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Download, Calendar, Code, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopId } from "@/hooks/useShopId";
import { saveAs } from "file-saver";

const TABLE_MAP: Record<string, string> = {
  customers: 'customers',
  vehicles: 'vehicles',
  work_orders: 'work_orders',
  invoices: 'invoices',
  inventory: 'inventory_items',
  team_members: 'profiles',
  feedback: 'work_order_feedback',
  communications: 'communications'
};

export function DataExportTab() {
  const [exportType, setExportType] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<string>("csv");
  const [isLoading, setIsLoading] = useState(false);
  const [checkedTables, setCheckedTables] = useState<{ [key: string]: boolean }>({
    customers: true,
    vehicles: true,
    work_orders: true,
    invoices: true,
    inventory: true,
    team_members: false,
    feedback: false,
    communications: false
  });
  const { toast } = useToast();
  const { shopId } = useShopId();

  const toggleCheck = (tableName: string) => {
    setCheckedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const exportTableToCSV = (data: any[], tableName: string): string => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    data.forEach(row => {
      csvRows.push(headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','));
    });
    return csvRows.join('\n');
  };

  const handleExport = async () => {
    if (!shopId) {
      toast({ title: "Error", description: "No shop selected", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const tablesToExport = exportType === 'all' 
        ? Object.keys(checkedTables) 
        : Object.entries(checkedTables).filter(([_, checked]) => checked).map(([name]) => name);
      
      let allData: Record<string, any[]> = {};
      
      for (const tableKey of tablesToExport) {
        const dbTable = TABLE_MAP[tableKey];
        if (!dbTable) continue;
        
        const { data, error } = await supabase
          .from(dbTable as any)
          .select('*')
          .eq('shop_id', shopId)
          .limit(10000);
        
        if (!error && data) {
          allData[tableKey] = data;
        }
      }
      
      if (exportFormat === 'csv') {
        // Export each table as separate CSV
        for (const [tableName, data] of Object.entries(allData)) {
          if (data.length > 0) {
            const csv = exportTableToCSV(data, tableName);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `${tableName}-export-${new Date().toISOString().split('T')[0]}.csv`);
          }
        }
      } else {
        // Export as JSON
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        saveAs(blob, `data-export-${new Date().toISOString().split('T')[0]}.json`);
      }
      
      toast({
        title: "Export Complete",
        description: `Exported ${Object.keys(allData).length} tables successfully.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error processing your export request.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>
            Export your shop's data for backup or analysis purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-type">Export Type</Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger id="export-type">
                <SelectValue placeholder="Select export type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Full Database Export</SelectItem>
                <SelectItem value="selected">Selected Tables Only</SelectItem>
                <SelectItem value="date-range">Date Range Export</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {exportType === "selected" && (
            <div className="space-y-3 pt-2">
              <Label>Select Tables to Export</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(checkedTables).map(tableName => (
                  <div key={tableName} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`table-${tableName}`} 
                      checked={checkedTables[tableName]}
                      onCheckedChange={() => toggleCheck(tableName)}
                    />
                    <Label 
                      htmlFor={`table-${tableName}`}
                      className="capitalize"
                    >
                      {tableName.replace(/_/g, ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {exportType === "date-range" && (
            <div className="flex items-start space-x-4 pt-2">
              <div className="w-full space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <input 
                    type="date" 
                    id="start-date" 
                    className="w-full border rounded-md px-3 py-1"
                  />
                </div>
              </div>
              
              <div className="w-full space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <input 
                    type="date" 
                    id="end-date" 
                    className="w-full border rounded-md px-3 py-1"
                  />
                </div>
              </div>
            </div>
          )}
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="export-format">Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger id="export-format" className="flex items-center">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>CSV (Comma Separated Values)</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    <span>JSON (JavaScript Object Notation)</span>
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Excel Spreadsheet</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="include-metadata" defaultChecked />
            <Label htmlFor="include-metadata">Include metadata and timestamps</Label>
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button 
              className="bg-esm-blue-600 hover:bg-esm-blue-700"
              onClick={handleExport}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Start Export"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            Previous exports available for download
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No previous exports available</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
