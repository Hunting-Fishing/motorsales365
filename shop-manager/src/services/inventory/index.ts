
// Re-export inventory CRUD operations
import { 
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  updateInventoryQuantity,
  deleteInventoryItem
} from './crudService';

// Re-export filter operations
import { 
  filterInventoryItems,
  getInventoryCategories,
  getInventorySuppliers,
  getInventoryLocations,
  getInventoryStatuses
} from './filterService';

// Re-export transaction operations
import {
  recordInventoryTransaction,
  getItemTransactions,
  getInventoryTransactions,
  getTransactionsForItem,
  createInventoryTransaction
} from './transactionService';

// Re-export utils
import {
  getInventoryStatus,
  formatInventoryItem,
  formatInventoryForApi,
  mapApiToInventoryItem,
  countLowStockItems,
  countOutOfStockItems,
  calculateTotalValue
} from './utils';

// Export aliases (to avoid naming conflicts)
const getAllInventoryItems = getInventoryItems;

// Export everything
export {
  // CRUD operations
  getInventoryItems,
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  updateInventoryQuantity,
  deleteInventoryItem,
  
  // Filter operations
  filterInventoryItems,
  getInventoryCategories,
  getInventorySuppliers,
  getInventoryLocations,
  getInventoryStatuses,
  
  // Transaction operations
  recordInventoryTransaction,
  getItemTransactions,
  getInventoryTransactions,
  getTransactionsForItem,
  createInventoryTransaction,
  
  // Utils
  getInventoryStatus,
  formatInventoryItem,
  formatInventoryForApi,
  mapApiToInventoryItem,
  countLowStockItems,
  countOutOfStockItems,
  calculateTotalValue
};
