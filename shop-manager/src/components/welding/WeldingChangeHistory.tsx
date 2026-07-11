import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Clock } from "lucide-react";

interface ChangeHistoryProps {
  history: any[];
  showHistory: boolean;
  onToggle: () => void;
  changeTypeLabels?: Record<string, string>;
  fieldLabels?: Record<string, string>;
}

const defaultChangeTypeLabels: Record<string, string> = {
  status_change: "Status Changed",
  amount_change: "Amount Updated",
  converted_to_invoice: "Converted to Invoice",
  payment: "Payment Recorded",
  update: "Updated",
};

const defaultFieldLabels: Record<string, string> = {
  status: "Status",
  estimated_amount: "Estimated Amount",
  labour_hours: "Labour Hours",
  travel_cost: "Travel Cost",
  converted_to_invoice: "Invoice",
  subtotal: "Subtotal",
  total: "Total",
  tax_rate: "Tax Rate",
  due_date: "Due Date",
  notes: "Notes",
  amount_paid: "Amount Paid",
};

const WeldingChangeHistory = ({
  history, showHistory, onToggle,
  changeTypeLabels = defaultChangeTypeLabels,
  fieldLabels = defaultFieldLabels,
}: ChangeHistoryProps) => (
  <div>
    <Button variant="outline" size="sm" onClick={onToggle} className="flex items-center gap-1">
      <History className="h-3 w-3" />
      {showHistory ? "Hide" : "View"} History
      {history.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{history.length}</Badge>}
    </Button>
    {showHistory && (
      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
        ) : (
          history.map((h: any) => {
            const who = h.profiles
              ? `${h.profiles.first_name || ""} ${h.profiles.last_name || ""}`.trim() || "Unknown"
              : "System";
            return (
              <div key={h.id} className="flex items-start gap-2 text-xs border-l-2 border-muted pl-3 py-1">
                <Clock className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1">
                      {changeTypeLabels[h.change_type] || h.change_type}
                    </Badge>
                    <span className="text-muted-foreground">by <strong>{who}</strong></span>
                  </div>
                  <div className="mt-0.5">
                    <span className="font-medium">{fieldLabels[h.field_name] || h.field_name}:</span>{" "}
                    {h.old_value && <span className="line-through text-muted-foreground">{h.old_value}</span>}
                    {h.old_value && h.new_value && " → "}
                    {h.new_value && <span className="font-medium">{h.new_value}</span>}
                  </div>
                  <div className="text-muted-foreground mt-0.5">{new Date(h.created_at).toLocaleString()}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    )}
  </div>
);

export default WeldingChangeHistory;
