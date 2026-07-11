
import { EmailCampaignStatus, EmailABTest } from '@/types/email';

/**
 * Validates a string value against allowed EmailCampaignStatus values
 */
export const validateCampaignStatus = (status: string): EmailCampaignStatus => {
  const validStatuses: EmailCampaignStatus[] = [
    'draft', 
    'scheduled', 
    'sending', 
    'sent', 
    'paused', 
    'completed', 
    'cancelled'
  ];
  
  return validStatuses.includes(status as EmailCampaignStatus) 
    ? status as EmailCampaignStatus 
    : 'draft';
};

/**
 * Safely parses a JSON field with error handling
 */
export const parseJsonField = <T>(field: any, defaultValue: T): T => {
  try {
    if (field === null || field === undefined) return defaultValue;
    
    // If it's already an object, return it
    if (typeof field === 'object' && !Array.isArray(field)) return field;
    
    // Otherwise, try to parse it as JSON
    const fieldStr = typeof field === 'string' ? field : JSON.stringify(field);
    return JSON.parse(fieldStr);
  } catch (e) {
    console.error("Error parsing JSON field:", e);
    return defaultValue;
  }
};

/**
 * Parses AB test data into the correct format
 */
export const parseABTest = (abTestData: any): EmailABTest | null => {
  if (!abTestData) return null;
  
  try {
    const testData = typeof abTestData === 'object' 
      ? abTestData 
      : parseJsonField(abTestData, null);
    
    if (
      testData &&
      typeof testData === 'object' &&
      typeof testData.enabled === 'boolean' && 
      Array.isArray(testData.variants) && 
      typeof testData.winnerCriteria === 'string'
    ) {
      return {
        enabled: testData.enabled,
        variants: testData.variants,
        winnerCriteria: testData.winnerCriteria as 'open_rate' | 'click_rate',
        winner_criteria: testData.winnerCriteria as 'open_rate' | 'click_rate',
        winnerSelectionDate: testData.winnerSelectionDate,
        winner_selection_date: testData.winnerSelectionDate,
        winnerId: testData.winnerId,
        winner_id: testData.winnerId,
        confidenceLevel: testData.confidenceLevel,
        confidence_level: testData.confidenceLevel
      };
    } else if (
      testData &&
      typeof testData === 'object' &&
      typeof testData.enabled === 'boolean' && 
      Array.isArray(testData.variants) && 
      typeof testData.winner_criteria === 'string'
    ) {
      return {
        enabled: testData.enabled,
        variants: testData.variants,
        winnerCriteria: testData.winner_criteria as 'open_rate' | 'click_rate',
        winner_criteria: testData.winner_criteria as 'open_rate' | 'click_rate',
        winnerSelectionDate: testData.winner_selection_date,
        winner_selection_date: testData.winner_selection_date,
        winnerId: testData.winner_id,
        winner_id: testData.winner_id,
        confidenceLevel: testData.confidence_level,
        confidence_level: testData.confidence_level
      };
    }
  } catch (e) {
    console.error("Error parsing AB test data:", e);
  }
  
  return null;
};
