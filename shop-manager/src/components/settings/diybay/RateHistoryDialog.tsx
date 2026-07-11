
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import { Bay, RateHistory } from "@/services/diybay/diybayService";
import { formatDistanceToNow } from "date-fns";

interface RateHistoryDialogProps {
  bay: Bay | null;
  rateHistory: RateHistory[];
  isOpen: boolean;
  onClose: () => void;
}

export const RateHistoryDialog: React.FC<RateHistoryDialogProps> = ({
  bay,
  rateHistory,
  isOpen,
  onClose,
}) => {
  if (!bay) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Rate History for {bay.bay_name}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Hourly Rate</TableHead>
                <TableHead className="text-right">Daily Rate</TableHead>
                <TableHead className="text-right">Weekly Rate</TableHead>
                <TableHead className="text-right">Monthly Rate</TableHead>
                <TableHead>Changed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No rate history found.
                  </TableCell>
                </TableRow>
              ) : (
                rateHistory.map((entry) => {
                  // Use changed_at or fall back to created_at
                  const changeDate = entry.changed_at || entry.created_at || '';
                  
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {changeDate
                          ? formatDistanceToNow(new Date(changeDate), {
                              addSuffix: true,
                            })
                          : "Unknown date"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.hourly_rate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.daily_rate
                          ? formatCurrency(entry.daily_rate)
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.weekly_rate
                          ? formatCurrency(entry.weekly_rate)
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.monthly_rate
                          ? formatCurrency(entry.monthly_rate)
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {entry.user_email || "System"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
