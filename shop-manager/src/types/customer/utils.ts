
import { Customer } from './base';

export const getCustomerFullName = (customer: Customer): string => {
  return `${customer.first_name} ${customer.last_name}`;
};

export const adaptCustomerForUI = (customer: Customer): Customer => {
  // Handle segments - ensure it's properly converted from JSON to array
  let segments = customer.segments;
  if (segments && typeof segments === 'string') {
    try {
      segments = JSON.parse(segments);
    } catch (e) {
      segments = [];
    }
  } else if (!segments) {
    segments = [];
  }
  
  // Handle tags - ensure it's properly converted from JSON to array
  let tags = customer.tags;
  if (tags && typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch (e) {
      tags = [];
    }
  } else if (tags && typeof tags !== 'object') {
    try {
      tags = JSON.parse(tags.toString());
    } catch (e) {
      tags = [];
    }
  } else if (!tags) {
    tags = [];
  }
  
  return {
    ...customer,
    segments: Array.isArray(segments) ? segments : [],
    tags: Array.isArray(tags) ? tags : [],
    status: 'active',
    lastServiceDate: undefined,
    name: getCustomerFullName(customer),
    dateAdded: customer.created_at,
  };
};

export const createCustomerForUI = (
  dbCustomer: Customer,
  additionalProps?: {
    company?: string;
    notes?: string;
    lastServiceDate?: string;
    status?: string;
  }
): Customer => {
  return {
    ...dbCustomer,
    ...additionalProps,
    name: getCustomerFullName(dbCustomer),
    dateAdded: dbCustomer.created_at,
  };
};
