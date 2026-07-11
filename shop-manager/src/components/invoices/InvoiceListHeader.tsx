
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InvoiceListHeader() {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">
          Manage all customer invoices in your system.
        </p>
      </div>
      <div>
        <Button asChild className="flex items-center gap-2 bg-esm-blue-600 hover:bg-esm-blue-700">
          <Link to="/invoices/new">
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>
    </div>
  );
}
