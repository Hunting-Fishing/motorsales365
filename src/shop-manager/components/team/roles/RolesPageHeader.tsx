
import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Import, FileDown } from "lucide-react";
import { Role } from "@/types/team";

interface RolesPageHeaderProps {
  onAddRoleClick: () => void;
  onExportRoles: () => void;
  onImportRoles: (roles: Role[]) => void;
}

export function RolesPageHeader({ 
  onAddRoleClick, 
  onExportRoles, 
  onImportRoles 
}: RolesPageHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedRoles = JSON.parse(e.target?.result as string) as Role[];
        onImportRoles(importedRoles);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error("Error parsing imported roles:", error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link to="/team">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Team Roles & Permissions</h1>
          </div>
          <p className="text-muted-foreground">
            Manage role definitions and permission sets for team members
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleImportClick}
            className="flex items-center gap-2"
            size="sm"
          >
            <Import className="h-4 w-4" />
            Import Roles
          </Button>
          <Button 
            variant="outline"
            onClick={onExportRoles}
            className="flex items-center gap-2"
            size="sm"
          >
            <FileDown className="h-4 w-4" />
            Export Roles
          </Button>
          <Button 
            onClick={onAddRoleClick}
            className="bg-esm-blue-600 hover:bg-esm-blue-700 flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add New Role
          </Button>
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
