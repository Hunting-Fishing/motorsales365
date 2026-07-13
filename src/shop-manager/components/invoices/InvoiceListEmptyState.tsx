
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function InvoiceListEmptyState() {
  return (
    <tr>
      <td colSpan={9} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center">
          <FileText className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices found</h3>
          <p className="text-slate-500 mb-4">Get started by creating your first invoice.</p>
          <Button asChild>
            <Link to="/invoices/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}
