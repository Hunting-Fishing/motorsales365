
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Flag, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface HistoryRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  flagged: boolean;
  resolved: boolean;
}

interface HistoryTableProps {
  records: HistoryRecord[];
  onViewDetails?: (record: HistoryRecord) => void;
  onFlag?: (record: HistoryRecord) => void;
  onResolve?: (record: HistoryRecord) => void;
}

export function HistoryTable({ 
  records, 
  onViewDetails = () => {}, 
  onFlag = () => {},
  onResolve = () => {}
}: HistoryTableProps) {
  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "success";
      case "update":
        return "info";
      case "delete":
        return "destructive";
      case "login":
        return "default";
      case "logout":
        return "outline";
      case "permission change":
        return "warning";
      default:
        return "secondary";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            <TableRow key={record.id} colorIndex={index}>
              <TableCell>
                <div className="font-medium">{record.userName}</div>
                <div className="text-xs text-muted-foreground">{record.userId}</div>
              </TableCell>
              <TableCell>
                <Badge variant={getActionBadgeVariant(record.action)}>
                  {record.action}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {record.details}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {format(new Date(record.timestamp), "MMM dd, yyyy HH:mm")}
              </TableCell>
              <TableCell>
                {record.flagged ? (
                  record.resolved ? (
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      Resolved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-500 border-red-500">
                      Flagged
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-gray-500">
                    Normal
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetails(record)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                
                {record.flagged && !record.resolved ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onResolve(record)}
                    className="h-8 w-8 p-0 text-green-500 hover:text-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                ) : !record.flagged ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onFlag(record)}
                    className="h-8 w-8 p-0 text-amber-500 hover:text-amber-700"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
