import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History, Search, Download, Gauge, Clock, Filter } from 'lucide-react';
import { useEquipmentHourHistory, useAllComponentsHourHistory } from '@/hooks/useComponentHours';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface EquipmentHourHistoryProps {
  equipmentId?: string;
  parentEquipmentId?: string;
  title?: string;
  showExport?: boolean;
  compact?: boolean;
}

export function EquipmentHourHistory({
  equipmentId,
  parentEquipmentId,
  title = 'Hour Reading History',
  showExport = true,
  compact = false,
}: EquipmentHourHistoryProps) {
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Use either single equipment or all components history
  const { data: singleHistory, isLoading: loadingSingle } = useEquipmentHourHistory(equipmentId, 100);
  const { data: allHistory, isLoading: loadingAll } = useAllComponentsHourHistory(parentEquipmentId, 100);

  const isLoading = loadingSingle || loadingAll;
  const rawHistory = equipmentId ? singleHistory : allHistory;

  // Filter by date range
  const filterByDate = (history: any[]) => {
    if (dateFilter === 'all') return history;
    
    const daysMap: Record<string, number> = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
    };
    
    const days = daysMap[dateFilter];
    if (!days) return history;
    
    const cutoff = subDays(new Date(), days);
    return history.filter(h => isAfter(parseISO(h.reading_date), cutoff));
  };

  // Filter by search term
  const filterBySearch = (history: any[]) => {
    if (!searchTerm) return history;
    const term = searchTerm.toLowerCase();
    return history.filter(h => 
      h.equipment_name?.toLowerCase().includes(term) ||
      h.notes?.toLowerCase().includes(term) ||
      h.recorded_by_name?.toLowerCase().includes(term)
    );
  };

  const filteredHistory = filterBySearch(filterByDate(rawHistory || []));

  // Calculate hours added between readings
  const getHoursAdded = (current: any, index: number) => {
    if (!filteredHistory || index >= filteredHistory.length - 1) return null;
    
    // Find the previous reading for the same equipment
    const prevReadings = filteredHistory
      .slice(index + 1)
      .filter(h => h.equipment_id === current.equipment_id || !parentEquipmentId);
    
    if (prevReadings.length === 0) return null;
    
    const prev = prevReadings[0];
    const diff = current.reading_value - prev.reading_value;
    return diff > 0 ? diff : null;
  };

  const handleExport = () => {
    if (!filteredHistory || filteredHistory.length === 0) return;

    const csvContent = [
      ['Date', 'Equipment', 'Hours', 'Hours Added', 'Recorded By', 'Notes'].join(','),
      ...filteredHistory.map((h, i) => [
        format(new Date(h.reading_date), 'yyyy-MM-dd HH:mm'),
        h.equipment_name || 'N/A',
        h.reading_value,
        getHoursAdded(h, i) || '-',
        h.recorded_by_name,
        `"${(h.notes || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hour-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={compact ? 'pb-3' : ''}>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${compact ? 'text-base' : ''}`}>
            <History className="h-4 w-4" />
            {title}
          </CardTitle>
          {showExport && filteredHistory.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
        
        {/* Filters */}
        {!compact && (
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by equipment, notes, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Gauge className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hour readings found</p>
            <p className="text-sm">Readings will appear here after logging hours</p>
          </div>
        ) : (
          <ScrollArea className={compact ? 'h-[300px]' : 'h-[400px]'}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {parentEquipmentId && <TableHead>Equipment</TableHead>}
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                  <TableHead>Recorded By</TableHead>
                  {!compact && <TableHead>Notes</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((entry, index) => {
                  const hoursAdded = getHoursAdded(entry, index);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(entry.reading_date), compact ? 'MMM d' : 'MMM d, yyyy h:mm a')}
                        </div>
                      </TableCell>
                      {parentEquipmentId && (
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {entry.equipment_name}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right font-mono font-semibold">
                        {entry.reading_value?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {hoursAdded ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                            +{hoursAdded.toFixed(1)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.recorded_by_name}
                      </TableCell>
                      {!compact && (
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {entry.notes || '-'}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
