
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Define relationship type
export interface RelationshipType {
  id: string;
  label: string;
}

export function useRelationshipData() {
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelationshipTypes = async () => {
      setIsLoading(true);
      try {
        // Query the database for relationship types
        const { data, error } = await supabase
          .from('relationship_types')
          .select('*');

        if (error) throw error;

        // If no data, use some defaults to ensure functionality
        if (!data || data.length === 0) {
          const defaults: RelationshipType[] = [
            { id: '1', label: 'Spouse' },
            { id: '2', label: 'Child' },
            { id: '3', label: 'Parent' },
            { id: '4', label: 'Sibling' },
            { id: '5', label: 'Friend' },
            { id: '6', label: 'Other' }
          ];
          setRelationshipTypes(defaults);
        } else {
          // Map database data to RelationshipType format
          const formattedData = data.map((item): RelationshipType => ({
            id: item.id,
            label: item.name || item.label
          }));
          setRelationshipTypes(formattedData);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching relationship types:', err);
        setError('Failed to load relationship types');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelationshipTypes();
  }, []);

  return { relationshipTypes, isLoading, error };
}
