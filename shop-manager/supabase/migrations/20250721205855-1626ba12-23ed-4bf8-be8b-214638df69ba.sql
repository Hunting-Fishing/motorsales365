-- Fix navigation href mismatches to match actual routes
UPDATE navigation_items SET href = '/shopping/cart' WHERE href = '/cart';
UPDATE navigation_items SET href = '/inventory/manager' WHERE href = '/inventory-manager';
UPDATE navigation_items SET href = '/inventory/orders' WHERE href = '/purchase-orders';
UPDATE navigation_items SET href = '/inventory/locations' WHERE href = '/locations';
UPDATE navigation_items SET href = '/inventory/suppliers' WHERE href = '/suppliers';