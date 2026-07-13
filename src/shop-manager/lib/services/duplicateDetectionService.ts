import { supabase } from '@/integrations/supabase/client';
import { ServiceJob } from '@/types/service';

export interface DuplicateMatch {
  job: ServiceJob;
  categoryName: string;
  subcategoryName: string;
  sectorName: string;
  similarityScore: number;
  matchType: 'exact' | 'high' | 'medium';
}

/**
 * Calculate similarity between two strings using a simple algorithm
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return shorter / longer;
  }
  
  // Simple word overlap calculation
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  const commonWords = words1.filter(word => 
    words2.some(w => w === word || w.includes(word) || word.includes(w))
  );
  
  if (commonWords.length === 0) return 0;
  
  return (commonWords.length * 2) / (words1.length + words2.length);
}

/**
 * Search for duplicate or similar job lines across all sectors
 */
export async function searchForDuplicates(
  jobName: string,
  jobDescription?: string,
  threshold: number = 0.7
): Promise<DuplicateMatch[]> {
  try {
    // Fetch all services with their hierarchy
    const { data: sectors, error } = await supabase
      .from('service_sectors')
      .select(`
        id,
        name,
        service_categories (
          id,
          name,
          service_subcategories (
            id,
            name,
            service_jobs (
              id,
              name,
              description,
              estimated_time,
              price
            )
          )
        )
      `)
      .eq('is_active', true);

    if (error) throw error;
    if (!sectors) return [];

    const matches: DuplicateMatch[] = [];

    // Search through all jobs
    for (const sector of sectors) {
      for (const category of sector.service_categories || []) {
        for (const subcategory of category.service_subcategories || []) {
          for (const job of subcategory.service_jobs || []) {
            // Calculate similarity based on name
            const nameSimilarity = calculateSimilarity(jobName, job.name);
            
            // Calculate similarity based on description if provided
            let descSimilarity = 0;
            if (jobDescription && job.description) {
              descSimilarity = calculateSimilarity(jobDescription, job.description);
            }
            
            // Combined score (name weighted more heavily)
            const similarityScore = jobDescription 
              ? (nameSimilarity * 0.7 + descSimilarity * 0.3)
              : nameSimilarity;

            // Only include if above threshold
            if (similarityScore >= threshold) {
              let matchType: 'exact' | 'high' | 'medium';
              if (similarityScore >= 0.95) matchType = 'exact';
              else if (similarityScore >= 0.85) matchType = 'high';
              else matchType = 'medium';

              matches.push({
                job: {
                  id: job.id,
                  name: job.name,
                  description: job.description || undefined,
                  estimatedTime: job.estimated_time || undefined,
                  price: job.price || undefined,
                  subcategory_id: subcategory.id
                },
                categoryName: category.name,
                subcategoryName: subcategory.name,
                sectorName: sector.name,
                similarityScore,
                matchType
              });
            }
          }
        }
      }
    }

    // Sort by similarity score (highest first)
    return matches.sort((a, b) => b.similarityScore - a.similarityScore);
  } catch (error) {
    console.error('Error searching for duplicates:', error);
    return [];
  }
}
