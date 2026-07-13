
import { useRelationshipData } from "@/hooks/useRelationshipData";

// This file now re-exports the hooks that fetch data from the database
export { useRelationshipData };

// Export types for backwards compatibility
export type RelationshipType = {
  id: string;
  label: string;
};

// For backwards compatibility with any code that imports directly from this file
export const shops: { id: string, name: string }[] = [];
export const relationshipTypes: RelationshipType[] = [];

// Customer segments and tags now come from the database tables
// Renamed predefinedTags for backwards compatibility, but it will be empty
export const predefinedTags = [];
export const predefinedSegments = [];
