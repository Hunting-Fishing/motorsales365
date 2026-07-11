
// Re-exporting all customer types from their modular files
export * from './customer/base';
export * from './customer/vehicle';
export * from './customer/notes';
export * from './customer/household';
export * from './customer/segment';
export * from './customer/technician';
export * from './customer/utils';

// Import the CustomerLoyalty type so that we can re-export it
import { CustomerLoyalty } from './loyalty';
export type { CustomerLoyalty };
