
import React from "react";
import { CustomerInteraction } from "@/types/interaction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InteractionTypeBadge } from "./InteractionTypeBadge";
import { InteractionStatusBadge } from "./InteractionStatusBadge";
import { format, parseISO } from "date-fns";
import { CalendarIcon, ClipboardList, Link as LinkIcon, User } from "lucide-react";
import { Link } from "react-router-dom";

interface InteractionDetailsDialogProps {
  interaction: CustomerInteraction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InteractionDetailsDialog: React.FC<InteractionDetailsDialogProps> = ({
  interaction,
  open,
  onOpenChange,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "PPP");
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Interaction Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <InteractionTypeBadge type={interaction.type} />
            <InteractionStatusBadge status={interaction.status} />
          </div>

          <div>
            <h3 className="font-medium text-lg">{interaction.description}</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-slate-500 mt-0.5" />
              <div>
                <p className="font-medium text-slate-700">Staff Member</p>
                <p>{interaction.staff_member_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CalendarIcon className="h-4 w-4 text-slate-500 mt-0.5" />
              <div>
                <p className="font-medium text-slate-700">Date</p>
                <p>{formatDate(interaction.date)}</p>
              </div>
            </div>

            {interaction.follow_up_date && (
              <div className="flex items-start gap-2">
                <CalendarIcon className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700">Follow-up Date</p>
                  <p>{formatDate(interaction.follow_up_date)}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Status: {interaction.follow_up_completed ? "Completed" : "Pending"}
                  </p>
                </div>
              </div>
            )}

            {interaction.notes && (
              <div className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700">Notes</p>
                  <p className="whitespace-pre-wrap">{interaction.notes}</p>
                </div>
              </div>
            )}

            {interaction.related_work_order_id && (
              <div className="flex items-start gap-2">
                <LinkIcon className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700">Related Work Order</p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    asChild
                  >
                    <Link to={`/work-orders/${interaction.related_work_order_id}`}>
                      View Work Order
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            
            {interaction.type === "follow_up" && !interaction.follow_up_completed && (
              <Button asChild>
                <Link to={`/customers/${interaction.customer_id}`}>
                  Go to Customer
                </Link>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
