
# Pages Directory

## ⚠️ CRITICAL NOTICE - Existing Functionality

Before replacing any page with "coming soon" placeholders, CHECK if working components already exist:

### Pages with FULL FUNCTIONALITY (do not replace):
- **Customers.tsx** → Uses `@/components/customers/CustomersPage`
- **Dashboard.tsx** → Full dashboard implementation

### Pages that may need implementation:
- **WorkOrders.tsx** → Check for existing work order components
- **Inventory.tsx** → Check for existing inventory components  
- **Team.tsx** → Check for existing team components
- **Settings.tsx** → Check for existing settings components

## Before Making Changes

1. Check if components exist in `/src/components/[feature-name]/`
2. Look for existing hooks in `/src/hooks/`
3. Search for related database services
4. Only create placeholders if NO existing functionality is found

## Pattern to Follow

```tsx
// GOOD - Uses existing component
import { ExistingComponent } from '@/components/feature/ExistingComponent';
export default function PageName() {
  return <ExistingComponent />;
}

// BAD - Replaces working functionality with placeholder
export default function PageName() {
  return <div>Coming soon...</div>;
}
```
