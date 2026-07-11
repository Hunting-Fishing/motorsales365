
import { AffiliateProduct } from '@/types/affiliate';

/**
 * Sample product generation has been completely disabled
 * All products should come from real data sources or user input through the application
 */
export const generateManufacturerProducts = (manufacturerId: string, count: number = 8): AffiliateProduct[] => {
  console.log('Sample product generation has been disabled. Please add real products through the application interface.');
  return [];
};
