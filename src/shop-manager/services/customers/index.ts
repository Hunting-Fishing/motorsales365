
// Re-export everything from the customer service modules
export * from '../customer/customerQueryService';
export * from '../customer/customerUpdateService';
export * from '../customer/customerNotesService';
export * from '../customer/customerDeleteService';
export * from '../customer/customerCreateService';
export * from '../customer/customerSearchService';
export * from '../customer/customerDraftService';
export * from '../customer/interactions/interactionQueryService';
export * from '../customer/interactions/interactionMutationService';

// Export the renamed functions to match what existing code expects
export { getCustomerById } from '../customer/customerQueryService';
export { getAllCustomers } from '../customer/customerQueryService';
export { updateCustomer } from '../customer/customerUpdateService';
export { deleteCustomer } from '../customer/customerDeleteService';
export { createCustomer } from '../customer/customerCreateService';
export { searchCustomers, checkDuplicateCustomers } from '../customer/customerSearchService';
export { saveDraftCustomer, getDraftCustomer, clearDraftCustomer } from '../customer/customerDraftService';
