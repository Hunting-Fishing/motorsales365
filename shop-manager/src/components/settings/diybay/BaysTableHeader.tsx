
import React from "react";
import { TableHeader, TableHead, TableRow } from "@/components/ui/table";

export const BaysTableHeader: React.FC = () => {
  return (
    <TableHeader className="bg-gray-50">
      <TableRow className="border-b border-gray-200">
        <TableHead className="w-10"></TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Location</TableHead>
        <TableHead className="text-right">Hourly Rate</TableHead>
        <TableHead className="text-right">Daily Rate</TableHead>
        <TableHead className="text-right">Weekly Rate</TableHead>
        <TableHead className="text-right">Monthly Rate</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};
