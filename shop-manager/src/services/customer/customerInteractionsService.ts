
// This file re-exports from the refactored modules for backwards compatibility
import {
  getCustomerInteractions,
  getVehicleInteractions,
  getPendingFollowUps
} from './interactions/interactionQueryService';

import {
  addCustomerInteraction,
  updateCustomerInteraction,
  deleteCustomerInteraction,
  completeFollowUp
} from './interactions/interactionMutationService';

// Re-export everything for backward compatibility
export {
  getCustomerInteractions,
  getVehicleInteractions,
  addCustomerInteraction,
  updateCustomerInteraction,
  deleteCustomerInteraction,
  completeFollowUp,
  getPendingFollowUps
};
