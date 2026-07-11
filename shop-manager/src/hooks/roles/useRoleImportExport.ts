
import { Role } from "@/types/team";
import { toast } from "@/hooks/use-toast";
import { validateImportedRoles } from "@/utils/roleImportExport";

export function useRoleImportExport(roles: Role[], setRoles: React.Dispatch<React.SetStateAction<Role[]>>) {
  const handleImportRoles = (importedRoles: Role[]) => {
    const validation = validateImportedRoles(importedRoles);
    
    if (!validation.valid) {
      toast({
        title: "Import failed",
        description: validation.message || "Invalid role data",
        variant: "destructive",
      });
      return false;
    }

    const defaultRoleIds = roles.filter(role => role.isDefault).map(role => role.id);
    const customImportedRoles = importedRoles.filter(role => !defaultRoleIds.includes(role.id));
    
    const existingRoleNames = new Set(roles.map(role => role.name.toLowerCase()));
    const duplicates = customImportedRoles.filter(role => 
      existingRoleNames.has(role.name.toLowerCase())
    );
    
    // Get the highest current priority
    const highestPriority = roles.length > 0 
      ? Math.max(...roles.map(role => role.priority)) 
      : 0;
    
    // Add priority to imported roles if they don't have it
    let nextPriority = highestPriority + 1;
    const processedRoles = customImportedRoles
      .filter(role => !existingRoleNames.has(role.name.toLowerCase()))
      .map(role => {
        if (role.priority === undefined) {
          const newRole = { ...role, priority: nextPriority };
          nextPriority++;
          return newRole;
        }
        return role;
      });
    
    if (duplicates.length > 0) {
      setRoles([...roles, ...processedRoles]);
      
      toast({
        title: "Roles imported with warnings",
        description: `Imported ${processedRoles.length} roles. ${duplicates.length} roles were skipped due to name conflicts.`,
        variant: "warning",
      });
    } else {
      setRoles([...roles, ...processedRoles]);
      
      toast({
        title: "Roles imported successfully",
        description: `Imported ${processedRoles.length} roles`,
        variant: "success",
      });
    }
    
    return true;
  };

  return { handleImportRoles };
}
