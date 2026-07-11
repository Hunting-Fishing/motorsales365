
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Item {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface PartsAndServicesTableProps {
  items: Item[];
  setItems: (items: Item[]) => void;
}

export const PartsAndServicesTable = ({ 
  items, 
  setItems 
}: PartsAndServicesTableProps) => {
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  
  // Generate a unique ID for new parts
  const generateId = () => `part-${Date.now()}`;
  
  // Handle form submission to add a new part
  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    e.stopPropagation(); // Stop event propagation
    
    if (partName && quantity > 0 && unitPrice >= 0) {
      const newPart = {
        id: generateId(),
        name: partName,
        quantity,
        unitPrice
      };
      
      setItems([...items, newPart]);
      
      // Reset form fields
      setPartName("");
      setQuantity(1);
      setUnitPrice(0);
    }
  };
  
  // Handle removing a part
  const handleRemovePart = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  // Update part quantity
  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity > 0) {
      setItems(
        items.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  return (
    <div className="min-h-[400px]"> {/* Add fixed minimum height to prevent layout shifts */}
      <CardHeader>
        <CardTitle>Parts & Materials</CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Add Part Form */}
        <form onSubmit={handleAddPart} className="mb-6 grid grid-cols-12 gap-3 items-end">
          <div className="col-span-5">
            <label htmlFor="partName" className="block text-sm font-medium mb-1">
              Part Name
            </label>
            <Input
              id="partName"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="Enter part name"
              required
            />
          </div>
          
          <div className="col-span-2">
            <label htmlFor="quantity" className="block text-sm font-medium mb-1">
              Quantity
            </label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>
          
          <div className="col-span-3">
            <label htmlFor="unitPrice" className="block text-sm font-medium mb-1">
              Unit Price ($)
            </label>
            <Input
              id="unitPrice"
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              required
            />
          </div>
          
          <div className="col-span-2">
            <Button 
              type="submit" 
              className="w-full"
              onClick={(e) => {
                e.preventDefault();
                handleAddPart(e);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Part
            </Button>
          </div>
        </form>
        
        {/* Parts Table */}
        <div className="overflow-hidden rounded-md border">
          <Table className="min-h-[200px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Part Name</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No parts added yet. Use the form above to add parts.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          className="h-7 w-16 mx-1 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemovePart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </div>
  );
};
