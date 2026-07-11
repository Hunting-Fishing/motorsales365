
import { schedulingService } from './scheduling/schedulingService';
import { abTestingService } from './ab-testing/abTestingService';
import { sequenceProcessingService } from './sequences/sequenceProcessingService';

/**
 * Combined service for email processing functionality
 * Re-exports methods from more specific services for backward compatibility
 */
export const emailProcessingService = {
  // Schedule management
  getSequenceProcessingSchedule: schedulingService.getSequenceProcessingSchedule,
  updateSequenceProcessingSchedule: schedulingService.updateSequenceProcessingSchedule,
  
  // Sequence processing
  triggerSequenceProcessing: sequenceProcessingService.triggerSequenceProcessing,
  
  // A/B testing
  selectABTestWinner: abTestingService.selectABTestWinner
};
