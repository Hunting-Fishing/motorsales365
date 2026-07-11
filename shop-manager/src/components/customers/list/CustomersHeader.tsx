
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const CustomersHeader = () => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Manage your customers and view their service history
        </p>
      </div>
      <Button asChild>
        <Link to="/customers/create">
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </Link>
      </Button>
    </div>
  );
};
