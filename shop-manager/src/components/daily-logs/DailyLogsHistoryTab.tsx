import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Download, Gauge, Route, Fuel, Wrench, RefreshCw } from 'lucide-react';
import { useDailyLogsHistory, DailyLogsFilters } from '@/hooks/useDailyLogsHistory';
import { useEquipmentHierarchy } from '@/hooks/useEquipmentHierarchy';
import { format } from 'date-fns';

const logTypeIcons = {
  engine_hours: Gauge,
  trip: Route,
  fuel: Fuel,
  maintenance: Wrench
};

const logTypeLabels = {
  engine_hours: 'Engine Hours',
  trip: 'Trip',
  fuel: 'Fuel',
  maintenance: 'Maintenance'
};

const completionStatusColors: Record<string, string> = {
  early: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  on_time: 'bg-green-500/20 text-green-700 border-green-500/30',
  late: 'bg-red-500/20 text-red-700 border-red-500/30',
  breakdown: 'bg-orange-500/20 text-orange-700 border-orange-500/30'
};

export function DailyLogsHistoryTab() {
  const [filters, setFilters] = useState<DailyLogsFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: logs, isLoading, refetch } = useDailyLogsHistory(filters);
  const { allEquipment } = useEquipmentHierarchy();

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.equipment_name.toLowerCase().includes(term) ||
      log.description.toLowerCase().includes(term)
    );
  }) || [];

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    
    const headers = ['Date', 'Type', 'Equipment', 'Description', 'Value', 'Status'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.date), 'yyyy-MM-dd HH:mm'),
      logTypeLabels[log.type],
      log.equipment_name,
      log.description,
      log.value ? `${log.value} ${log.unit || ''}` : '',
      log.completion_status || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Daily Logs History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select
            value={filters.logType || 'all'}
            onValueChange={(value) => setFilters({ ...filters, logType: value === 'all' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Log Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="engine_hours">Engine Hours</SelectItem>
              <SelectItem value="trip">Trip Logs</SelectItem>
              <SelectItem value="fuel">Fuel Entries</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.equipmentId || 'all'}
            onValueChange={(value) => setFilters({ ...filters, equipmentId: value === 'all' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Equipment</SelectItem>
              {allEquipment.map(eq => (
                <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="From Date"
            value={filters.dateFrom || ''}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
          />

          <Input
            type="date"
            placeholder="To Date"
            value={filters.dateTo || ''}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
          />
        </div>

        {/* Results Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No logs found. Adjust filters or add new entries.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = logTypeIcons[log.type];
                  return (
                    <TableRow key={`${log.type}-${log.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">{logTypeLabels[log.type]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(log.date), 'MMM dd, yyyy')}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.date), 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{log.equipment_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.description}</TableCell>
                      <TableCell className="text-right">
                        {log.value !== undefined && (
                          <span className="font-mono">
                            {log.value.toLocaleString()} {log.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.completion_status && (
                          <Badge 
                            variant="outline" 
                            className={completionStatusColors[log.completion_status] || ''}
                          >
                            {log.completion_status.replace('_', ' ')}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filteredLogs.length} of {logs?.length || 0} logs</span>
          <div className="flex items-center gap-4">
            {Object.entries(logTypeLabels).map(([type, label]) => {
              const count = filteredLogs.filter(l => l.type === type).length;
              const Icon = logTypeIcons[type as keyof typeof logTypeIcons];
              return (
                <span key={type} className="flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  {count} {label}
                </span>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
