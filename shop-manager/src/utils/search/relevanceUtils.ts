
// Find exact and partial matches with relevance scoring
export const findMatches = (text: string, query: string): number => {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  
  // Exact match gets highest score
  if (normalizedText === normalizedQuery) return 100;
  
  // Contains exact match (whole word)
  if (normalizedText.includes(` ${normalizedQuery} `) || 
      normalizedText.startsWith(`${normalizedQuery} `) || 
      normalizedText.endsWith(` ${normalizedQuery}`)) {
    return 80;
  }
  
  // Contains the query as part of text
  if (normalizedText.includes(normalizedQuery)) {
    return 60;
  }
  
  // Contains parts of the query (split by space)
  const queryParts = normalizedQuery.split(' ').filter(p => p.length > 2);
  if (queryParts.some(part => normalizedText.includes(part))) {
    return 40;
  }
  
  return 0;
};
