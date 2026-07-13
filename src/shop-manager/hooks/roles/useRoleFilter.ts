
import { useState } from "react";
import { Role } from "@/types/team";

export function useRoleFilter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Filter roles based on search query and type filter
  const filterRoles = (roles: Role[]) => {
    return roles.filter(role => {
      const matchesSearch = role.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (typeFilter === "all") return matchesSearch;
      if (typeFilter === "default") return matchesSearch && role.isDefault;
      if (typeFilter === "custom") return matchesSearch && !role.isDefault;
      
      return matchesSearch;
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    filterRoles
  };
}
