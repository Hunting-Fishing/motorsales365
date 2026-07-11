import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import type { NearMissReport } from '@/hooks/useNearMissReports';

interface Props {
  report: NearMissReport;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
}

const severityColors: Record<string, string> = {
  minor: 'bg-green-500',
  moderate: 'bg-yellow-500',
  serious: 'bg-orange-500',
  catastrophic: 'bg-red-500'
};

export function NearMissCard({ report, onEdit, onStatusChange }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg">{report.report_number || 'Near Miss Report'}</CardTitle>
          <div className="flex gap-2">
            <Badge className={severityColors[report.potential_severity]}>{report.potential_severity}</Badge>
            <Badge variant="outline">{report.status.replace('_', ' ')}</Badge>
            {report.category && <Badge variant="secondary">{report.category.replace('_', ' ')}</Badge>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('reviewed')}>Mark Reviewed</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('closed')}>Close</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{format(new Date(report.report_date), 'MMM d, yyyy h:mm a')}</span>
          {report.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{report.location}</span>}
          {report.is_anonymous ? <Badge variant="outline">Anonymous</Badge> : report.reporter && <span className="flex items-center gap-1"><User className="h-4 w-4" />{report.reporter.first_name}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
