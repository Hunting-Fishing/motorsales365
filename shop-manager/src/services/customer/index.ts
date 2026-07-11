
export { 
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerVehicles
} from './customerService';

// Re-export customer types
export type { Customer, CustomerCreate } from '@/types/customer';
