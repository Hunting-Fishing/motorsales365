
import React from "react";
import { RoleCard } from "./RoleCard";

interface RolesGridProps {
  roles: any[];
  onEditRole: (role: any) => void;
  onDeleteRole: (role: any) => void;
  onDuplicateRole: (role: any) => void;
  onReorderRole: (roleId: string, direction: 'up' | 'down') => Promise<boolean> | boolean;
}

export function RolesGrid({ roles, onEditRole, onDeleteRole, onDuplicateRole, onReorderRole }: RolesGridProps) {
  if (roles.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50 rounded-lg border border-slate-200 mt-6">
        <p className="text-slate-500">No roles match your search criteria.</p>
      </div>
    );
  }

  // Sort roles by priority before rendering
  const sortedRoles = [...roles].sort((a, b) => (a.priority || 1) - (b.priority || 1));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {sortedRoles.map(role => (
        <RoleCard 
          key={role.id} 
          role={role} 
          onEdit={onEditRole} 
          onDelete={onDeleteRole}
          onDuplicate={onDuplicateRole}
          onReorder={onReorderRole}
          isFirst={(role.priority || 1) === Math.min(...roles.map(r => r.priority || 1))}
          isLast={(role.priority || 1) === Math.max(...roles.map(r => r.priority || 1))}
        />
      ))}
    </div>
  );
}
