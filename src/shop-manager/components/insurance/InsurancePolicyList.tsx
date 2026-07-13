import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, MoreHorizontal, Edit, Trash2, Eye, 
  FileText, Download, Ship, Truck 
} from "lucide-react";
import { InsurancePolicy, INSURANCE_TYPES } from "@/types/insurance";
import { useInsurancePolicies } from "@/hooks/useInsurancePolicies";
import { format, parseISO, differenceInDays } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface InsurancePolicyListProps {
  policies: InsurancePolicy[];
}

export function InsurancePolicyList({ policies }: InsurancePolicyListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { deletePolicy } = useInsurancePolicies();

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = 
      policy.policy_number.toLowerCase().includes(search.toLowerCase()) ||
      policy.insurance_provider.toLowerCase().includes(search.toLowerCase()) ||
      policy.equipment?.name?.toLowerCase().includes(search.toLowerCase()) ||
      `${policy.vehicle?.make} ${policy.vehicle?.model}`.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === "all" || policy.insurance_type === typeFilter;
    const matchesStatus = statusFilter === "all" || policy.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (policy: InsurancePolicy) => {
    const daysUntilExpiry = differenceInDays(parseISO(policy.expiration_date), new Date());
    
    if (policy.status === 'expired' || daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (daysUntilExpiry <= 30) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Expiring Soon</Badge>;
    }
    if (policy.status === 'cancelled') {
      return <Badge variant="secondary">Cancelled</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
  };

  const getAssetName = (policy: InsurancePolicy) => {
    if (policy.equipment) {
      return (
        <div className="flex items-center gap-2">
          <Ship className="h-4 w-4 text-muted-foreground" />
          <span>{policy.equipment.name}</span>
        </div>
      );
    }
    if (policy.vehicle) {
      return (
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span>{policy.vehicle.year} {policy.vehicle.make} {policy.vehicle.model}</span>
        </div>
      );
    }
    return <span className="text-muted-foreground">General Policy</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Insurance Policies
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search policies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Insurance Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {INSURANCE_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy #</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No insurance policies found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.policy_number}</TableCell>
                    <TableCell>{getAssetName(policy)}</TableCell>
                    <TableCell>{policy.insurance_provider}</TableCell>
                    <TableCell className="capitalize">{policy.insurance_type.replace('_', ' ')}</TableCell>
                    <TableCell>{formatCurrency(policy.premium_amount)}</TableCell>
                    <TableCell>{format(parseISO(policy.expiration_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(policy)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Policy
                          </DropdownMenuItem>
                          {policy.policy_document_url && (
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download Document
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deletePolicy.mutate(policy.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Policy
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filteredPolicies.length} of {policies.length} policies</span>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
