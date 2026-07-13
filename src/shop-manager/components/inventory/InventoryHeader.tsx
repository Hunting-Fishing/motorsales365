
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { PlusCircle, Package, ShoppingCart, Boxes, Truck, Tag, Home, Settings } from "lucide-react";

export function InventoryHeader() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="flex flex-col space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
      
      <div className="flex flex-wrap gap-2">
        <Button 
          asChild 
          variant={currentPath === "/inventory" ? "default" : "outline"}
          className={`rounded-full text-sm px-4 ${currentPath === "/inventory" ? "bg-blue-600 hover:bg-blue-700" : "border-blue-500 text-blue-600"}`}
        >
          <Link to="/inventory" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        
        <Button 
          asChild 
          variant={currentPath === "/inventory/stock" ? "default" : "outline"}
          className={`rounded-full text-sm px-4 ${currentPath === "/inventory/stock" ? "bg-blue-600 hover:bg-blue-700" : "border-blue-500 text-blue-600"}`}
        >
          <Link to="/inventory/stock" className="flex items-center gap-1">
            <Boxes className="h-4 w-4" />
            Stock Items
          </Link>
        </Button>

        <Button 
          asChild 
          variant={currentPath === "/inventory/orders" ? "default" : "outline"}
          className={`rounded-full text-sm px-4 ${currentPath === "/inventory/orders" ? "bg-blue-600 hover:bg-blue-700" : "border-blue-500 text-blue-600"}`}
        >
          <Link to="/inventory/orders" className="flex items-center gap-1">
            <ShoppingCart className="h-4 w-4" />
            Purchase Orders
          </Link>
        </Button>

        <Button 
          asChild 
          variant={currentPath === "/inventory/suppliers" ? "default" : "outline"}
          className={`rounded-full text-sm px-4 ${currentPath === "/inventory/suppliers" ? "bg-blue-600 hover:bg-blue-700" : "border-blue-500 text-blue-600"}`}
        >
          <Link to="/inventory/suppliers" className="flex items-center gap-1">
            <Truck className="h-4 w-4" />
            Suppliers
          </Link>
        </Button>
        
        <Button 
          asChild 
          variant={currentPath === "/inventory/categories" ? "default" : "outline"}
          className={`rounded-full text-sm px-4 ${currentPath === "/inventory/categories" ? "bg-blue-600 hover:bg-blue-700" : "border-blue-500 text-blue-600"}`}
        >
          <Link to="/inventory/categories" className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            Categories
          </Link>
        </Button>
        
        <Button 
          asChild 
          variant={currentPath === "/inventory/locations" ? "default" : "outline"}
          className={`rounded-full text-sm px-4 ${currentPath === "/inventory/locations" ? "bg-blue-600 hover:bg-blue-700" : "border-blue-500 text-blue-600"}`}
        >
          <Link to="/inventory/locations" className="flex items-center gap-1">
            <Home className="h-4 w-4" />
            Locations
          </Link>
        </Button>
        
        <Button 
          asChild 
          variant={currentPath === "/inventory/manager" ? "default" : "outline"}
          className={`rounded-full text-sm px-4 ${currentPath === "/inventory/manager" ? "bg-blue-600 hover:bg-blue-700" : "border-blue-500 text-blue-600"}`}
        >
          <Link to="/inventory/manager" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Mandatory Selectable Fields
          </Link>
        </Button>
        
        <Button asChild className="ml-auto rounded-full text-white bg-blue-600 hover:bg-blue-700">
          <Link to="/inventory/add" className="flex items-center gap-1">
            <PlusCircle className="h-4 w-4" />
            Add Item
          </Link>
        </Button>
      </div>
    </div>
  );
}
