export interface ComplaintData {
  description: string;
  scenario?: string;
  urgency?: string;
  symptomCategory?: string;
  specificSymptoms?: string;
  suspectedCause?: string;
}

/**
 * Parse complaint data from description field
 * Returns structured data if JSON, or plain description if string
 */
export const parseComplaintData = (description: string): ComplaintData => {
  if (!description) {
    return { description: "" };
  }

  try {
    const parsed = JSON.parse(description);
    if (parsed && typeof parsed === 'object' && parsed.description !== undefined) {
      return parsed as ComplaintData;
    }
  } catch {
    // Not JSON, return as plain description
  }

  return { description };
};

/**
 * Format complaint data for display
 * Returns a human-readable string representation
 */
export const formatComplaintForDisplay = (description: string): string => {
  const data = parseComplaintData(description);
  
  if (!data.scenario && !data.urgency && !data.symptomCategory) {
    // Simple description
    return data.description;
  }

  // Structured description - format nicely
  let formatted = data.description;
  
  if (data.scenario) {
    formatted += `\n\nWhen: ${data.scenario}`;
  }
  
  if (data.urgency) {
    formatted += `\nUrgency: ${data.urgency.toUpperCase()}`;
  }
  
  if (data.symptomCategory) {
    formatted += `\nCategory: ${data.symptomCategory}`;
  }
  
  if (data.specificSymptoms) {
    formatted += `\nSymptoms: ${data.specificSymptoms}`;
  }
  
  if (data.suspectedCause) {
    formatted += `\nSuspected Cause: ${data.suspectedCause}`;
  }

  return formatted;
};

/**
 * Get urgency level badge color
 */
export const getUrgencyBadgeVariant = (urgency: string | undefined): "default" | "destructive" | "secondary" | "outline" => {
  switch (urgency?.toLowerCase()) {
    case "critical":
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "default";
  }
};

/**
 * Check if complaint has structured data
 */
export const hasStructuredData = (description: string): boolean => {
  const data = parseComplaintData(description);
  return !!(data.scenario || data.urgency || data.symptomCategory || data.specificSymptoms || data.suspectedCause);
};