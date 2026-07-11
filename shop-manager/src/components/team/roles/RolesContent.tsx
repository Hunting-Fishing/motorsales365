
import React from "react";
import { Card } from "@/components/ui/card";
import { RolesSearch } from "./RolesSearch";
import { RolesGrid } from "./RolesGrid";

interface RolesContentProps {
  roles: any[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  onEditRole: (role: any) => void;
  onDeleteRole: (role: any) => void;
  onDuplicateRole: (role: any) => void;
  onReorderRole: (roleId: string, direction: 'up' | 'down') => Promise<boolean> | boolean;
}

export function RolesContent({
  roles,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onEditRole,
  onDeleteRole,
  onDuplicateRole,
  onReorderRole
}: RolesContentProps) {
  return (
    <Card className="p-6 border shadow-sm bg-white">
      <RolesSearch 
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
      />

      <RolesGrid 
        roles={roles} 
        onEditRole={onEditRole}
        onDeleteRole={onDeleteRole}
        onDuplicateRole={onDuplicateRole}
        onReorderRole={onReorderRole}
      />
    </Card>
  );
}
