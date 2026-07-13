
// Enhanced search utilities for intelligent service matching
export interface SearchMatch {
  score: number;
  matchType: 'exact' | 'word-boundary' | 'partial' | 'multi-word' | 'synonym';
  matchedTerms: string[];
  highlightRanges: Array<{ start: number; end: number }>;
}

// Common automotive abbreviations and synonyms
const AUTOMOTIVE_SYNONYMS: Record<string, string[]> = {
  'timing belt': ['cam belt', 'cambelt', 'timing chain'],
  'serpentine belt': ['drive belt', 'accessory belt', 'poly belt'],
  'brake pad': ['brake pads', 'pads', 'brake disc pad'],
  'oil change': ['oil service', 'lube service', 'oil & filter'],
  'tune up': ['tune-up', 'tuneup', 'service', 'maintenance'],
  'transmission': ['trans', 'gearbox', 'auto trans'],
  'air filter': ['engine filter', 'intake filter'],
  'cabin filter': ['pollen filter', 'ac filter', 'hvac filter'],
  'spark plug': ['spark plugs', 'plugs', 'ignition plugs'],
  'battery': ['car battery', 'auto battery', 'starting battery'],
  'alternator': ['charging system', 'generator'],
  'starter': ['starting motor', 'starter motor'],
  'radiator': ['cooling system', 'rad'],
  'water pump': ['coolant pump', 'cooling pump'],
  'thermostat': ['temp control', 'temperature control'],
  'muffler': ['exhaust', 'silencer'],
  'catalytic converter': ['cat', 'catalyst', 'emission control'],
  'shock absorber': ['shock', 'shocks', 'damper'],
  'strut': ['struts', 'suspension strut', 'macpherson strut'],
  'cv joint': ['cv', 'constant velocity joint', 'drive joint'],
  'tie rod': ['tie rod end', 'steering rod'],
  'ball joint': ['suspension ball joint', 'control arm ball joint'],
  'control arm': ['control arm bushings', 'control arm ball joint', 'lower control arm', 'upper control arm', 'suspension arm'],
  'wheel bearing': ['hub bearing', 'wheel hub'],
  'brake rotor': ['brake disc', 'rotor', 'disc'],
  'brake caliper': ['caliper', 'brake cylinder'],
  'master cylinder': ['brake master', 'brake master cylinder'],
  'power steering': ['ps', 'steering assist', 'hydraulic steering'],
  'fuel pump': ['gas pump', 'fuel delivery'],
  'fuel filter': ['gas filter', 'fuel strainer'],
  'fuel injector': ['injector', 'fuel injection'],
  'mass air flow': ['maf', 'air flow sensor', 'mass airflow'],
  'oxygen sensor': ['o2 sensor', 'lambda sensor'],
  'throttle body': ['throttle', 'throttle valve'],
  'pcv valve': ['positive crankcase ventilation', 'crankcase valve'],
  'egr valve': ['exhaust gas recirculation', 'emission valve']
};

// Common abbreviations that should be stripped for better matching
const COMMON_ABBREVIATIONS = [
  'r&r', 'r & r', 'remove & replace', 'remove and replace',
  'insp', 'inspect', 'inspection',
  'repl', 'replace', 'replacement',
  'svc', 'service', 'servicing',
  'chk', 'check', 'checking',
  'adj', 'adjust', 'adjustment',
  'lub', 'lubricate', 'lubrication',
  'cln', 'clean', 'cleaning'
];

// Normalize text for better matching
export const normalizeSearchText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
};

// Extract meaningful words from text (removing common abbreviations)
export const extractMeaningfulWords = (text: string): string[] => {
  const normalized = normalizeSearchText(text);
  const words = normalized.split(' ').filter(word => word.length > 1);
  
  // Filter out common abbreviations and short words
  return words.filter(word => {
    const isCommonAbbrev = COMMON_ABBREVIATIONS.some(abbrev => 
      normalizeSearchText(abbrev).includes(word) || word.includes(normalizeSearchText(abbrev))
    );
    return !isCommonAbbrev && word.length > 2;
  });
};

// Get synonyms for a search term
export const getSynonyms = (term: string): string[] => {
  const normalizedTerm = normalizeSearchText(term);
  
  for (const [key, synonyms] of Object.entries(AUTOMOTIVE_SYNONYMS)) {
    if (normalizeSearchText(key).includes(normalizedTerm) || 
        synonyms.some(synonym => normalizeSearchText(synonym).includes(normalizedTerm))) {
      return [key, ...synonyms];
    }
  }
  
  return [term];
};

// Enhanced search function with intelligent matching
export const enhancedSearch = (text: string, query: string): SearchMatch | null => {
  if (!text || !query) return null;
  
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);
  const queryWords = normalizedQuery.split(' ').filter(word => word.length > 0);
  
  let bestMatch: SearchMatch | null = null;
  let bestScore = 0;
  
  // 1. Exact match (highest priority)
  if (normalizedText === normalizedQuery) {
    return {
      score: 100,
      matchType: 'exact',
      matchedTerms: [query],
      highlightRanges: [{ start: 0, end: text.length }]
    };
  }
  
  // 2. Word boundary matches
  for (const word of queryWords) {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = Array.from(text.matchAll(wordRegex));
    
    if (matches.length > 0) {
      const score = 80 + (word.length * 2); // Longer words get higher scores
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          score,
          matchType: 'word-boundary',
          matchedTerms: [word],
          highlightRanges: matches.map(match => ({
            start: match.index || 0,
            end: (match.index || 0) + match[0].length
          }))
        };
      }
    }
  }
  
  // 3. Multi-word matches (bonus for multiple words found)
  const foundWords = queryWords.filter(word => {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
    return wordRegex.test(normalizedText);
  });
  
  if (foundWords.length > 1) {
    const score = 70 + (foundWords.length * 10);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        score,
        matchType: 'multi-word',
        matchedTerms: foundWords,
        highlightRanges: [] // Will be populated later if needed
      };
    }
  }
  
  // 4. Synonym matches
  for (const word of queryWords) {
    const synonyms = getSynonyms(word);
    for (const synonym of synonyms) {
      if (synonym !== word && normalizedText.includes(normalizeSearchText(synonym))) {
        const score = 60;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            score,
            matchType: 'synonym',
            matchedTerms: [word, synonym],
            highlightRanges: []
          };
        }
      }
    }
  }
  
  // 5. Partial matches (lowest priority)
  for (const word of queryWords) {
    if (word.length > 2 && normalizedText.includes(word)) {
      const score = 40 + word.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          score,
          matchType: 'partial',
          matchedTerms: [word],
          highlightRanges: []
        };
      }
    }
  }
  
  return bestMatch;
};

// Sort search results by relevance score
export const sortByRelevance = <T extends { name: string; description?: string }>(
  items: T[],
  query: string
): Array<T & { searchMatch: SearchMatch }> => {
  const results: Array<T & { searchMatch: SearchMatch }> = [];
  
  for (const item of items) {
    // Check name first (higher priority)
    let match = enhancedSearch(item.name, query);
    
    // If no match in name, check description
    if (!match && item.description) {
      match = enhancedSearch(item.description, query);
      if (match) {
        match.score *= 0.8; // Description matches get slightly lower score
      }
    }
    
    if (match) {
      results.push({ ...item, searchMatch: match });
    }
  }
  
  // Sort by score (descending)
  return results.sort((a, b) => b.searchMatch.score - a.searchMatch.score);
};

// Highlight matching terms in text
export const highlightMatches = (text: string, query: string): string => {
  const match = enhancedSearch(text, query);
  if (!match || match.highlightRanges.length === 0) {
    return text;
  }
  
  // Sort ranges by start position (descending) to avoid index shifting
  const sortedRanges = [...match.highlightRanges].sort((a, b) => b.start - a.start);
  
  let result = text;
  for (const range of sortedRanges) {
    const before = result.slice(0, range.start);
    const highlighted = result.slice(range.start, range.end);
    const after = result.slice(range.end);
    result = `${before}<mark class="bg-yellow-200 px-1 rounded">${highlighted}</mark>${after}`;
  }
  
  return result;
};
