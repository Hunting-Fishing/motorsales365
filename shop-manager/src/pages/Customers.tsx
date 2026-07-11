 
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { CustomersPage as RefactoredCustomersPage } from '@/components/customers/CustomersPage';
import CustomerDetails from './CustomerDetails';
import CustomerEdit from './CustomerEdit';
import CreateCustomer from './CreateCustomer';

/**
 * REFACTORED: Customer routing with nested routes
 * - Index route: Customer list with table and filters
 * - Details route: Customer information and tabs
 * - Edit route: Customer edit form
 * 
 * Uses 100% live Supabase data with proper error handling and loading states
 */
export default function Customers() {
  return (
    <Routes>
      <Route index element={<RefactoredCustomersPage />} />
      <Route path="create" element={<CreateCustomer />} />
      <Route path=":customerId" element={<CustomerDetails />} />
      <Route path=":customerId/edit" element={<CustomerEdit />} />
    </Routes>
  );
}
