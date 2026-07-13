
/**
 * Re-export all sequence-related services from a single import point
 * This maintains backward compatibility with existing code while providing a more modular structure
 */

import { sequenceCoreService } from './sequenceCoreService';
import { sequenceStepService } from './sequenceStepService';
import { sequenceEnrollmentService } from './sequenceEnrollmentService';
import { sequenceAnalyticsService } from './sequenceAnalyticsService';
import { sequenceProcessingService } from './sequenceProcessingService';

export const emailSequenceService = {
  // Core sequence operations
  getSequences: sequenceCoreService.getSequences,
  getSequenceById: sequenceCoreService.getSequenceById,
  createSequence: sequenceCoreService.createSequence,
  updateSequence: sequenceCoreService.updateSequence,
  deleteSequence: sequenceCoreService.deleteSequence,
  
  // Step operations
  getSequenceSteps: sequenceStepService.getSequenceSteps,
  createSequenceStep: sequenceStepService.createSequenceStep,
  updateSequenceStep: sequenceStepService.updateSequenceStep,
  deleteSequenceStep: sequenceStepService.deleteSequenceStep,
  updateStepActiveStatus: sequenceStepService.updateStepActiveStatus,
  
  // Enrollment operations
  getEnrollmentsBySequenceId: sequenceEnrollmentService.getEnrollmentsBySequenceId,
  getEnrollmentsByCustomerId: sequenceEnrollmentService.getEnrollmentsByCustomerId,
  pauseEnrollment: sequenceEnrollmentService.pauseEnrollment,
  resumeEnrollment: sequenceEnrollmentService.resumeEnrollment,
  cancelEnrollment: sequenceEnrollmentService.cancelEnrollment,
  
  // Analytics operations
  getSequenceAnalytics: sequenceAnalyticsService.getSequenceAnalytics,
  
  // Processing operations
  triggerSequenceProcessing: sequenceProcessingService.triggerSequenceProcessing,
  processEnrollmentNextStep: sequenceProcessingService.processEnrollmentNextStep,
  checkProcessingHealth: sequenceProcessingService.checkProcessingHealth
};
