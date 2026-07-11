
# Customer Management Components

## ⚠️ CRITICAL - DO NOT REPLACE WITH PLACEHOLDERS

This directory contains a fully functional customer management system with:

- **CustomersPage.tsx** - Main customer list and management interface
- **list/CustomersList.tsx** - Customer list component with filtering
- **details/** - Customer detail pages and tabs
- **create/** - Customer creation forms and workflows
- **form/** - Comprehensive customer form components

## Usage

The main entry point is `CustomersPage` which should be imported in `src/pages/Customers.tsx`:

```tsx
import { CustomersPage } from '@/components/customers/CustomersPage';

export default function Customers() {
  return <CustomersPage />;
}
```

## Features Included

- ✅ Customer list with search and filtering
- ✅ Customer creation and editing
- ✅ Customer details with tabs (service history, notes, etc.)
- ✅ Vehicle management per customer
- ✅ Communication tracking
- ✅ Live data integration with Supabase

**This is NOT a placeholder - it's a complete working system!**
