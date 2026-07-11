
import { Role } from '@/types/team';

/**
 * Exports roles as a JSON file for download
 */
export const exportRolesToJson = (roles: Role[], filename = "team-roles"): void => {
  const jsonStr = JSON.stringify(roles, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  URL.revokeObjectURL(url);
};

/**
 * Validates imported role data
 */
export const validateImportedRoles = (roles: any[]): { valid: boolean; message?: string } => {
  // Check if it's an array
  if (!Array.isArray(roles)) {
    return { valid: false, message: "Imported data is not a valid array" };
  }
  
  // Check if array is empty
  if (roles.length === 0) {
    return { valid: false, message: "No roles found in the imported file" };
  }
  
  // Check if each item has required properties
  for (const role of roles) {
    if (!role.id || !role.name || !role.permissions) {
      return { 
        valid: false, 
        message: "One or more roles are missing required properties (id, name, permissions)" 
      };
    }
    
    // Add priority if it doesn't exist
    if (role.priority === undefined) {
      role.priority = 999; // High value to put at end of list
    }
  }
  
  return { valid: true };
};
