
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Edit, Trash2, Plus, Search, ArrowUpDown, Star, Trophy } from "lucide-react";
import { toast } from 'sonner';
import { fetchAllProducts, deleteProductAdmin, toggleProductFeature, toggleProductBestseller } from '@/services/admin/productAdminService';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/services/admin/productAdminService';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const ProductsManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchAllProducts(true); // Include unapproved products for admin
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const success = await deleteProductAdmin(id);
        if (success) {
          setProducts(products.filter(product => product.id !== id));
          toast.success("Product deleted successfully");
        } else {
          toast.error("Failed to delete product");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
      }
    }
  };

  const handleToggleFeature = async (id: string, featured: boolean) => {
    try {
      const success = await toggleProductFeature(id, !featured);
      if (success) {
        setProducts(products.map(product => 
          product.id === id ? { ...product, is_featured: !featured } : product
        ));
        toast.success(`Product ${!featured ? 'featured' : 'unfeatured'} successfully`);
      } else {
        toast.error("Failed to update product feature status");
      }
    } catch (error) {
      console.error("Error updating product feature status:", error);
      toast.error("Failed to update product feature status");
    }
  };

  const handleToggleBestseller = async (id: string, bestseller: boolean) => {
    try {
      const success = await toggleProductBestseller(id, !bestseller);
      if (success) {
        setProducts(products.map(product => 
          product.id === id ? { ...product, is_bestseller: !bestseller } : product
        ));
        toast.success(`Product ${!bestseller ? 'marked as bestseller' : 'unmarked as bestseller'} successfully`);
      } else {
        toast.error("Failed to update product bestseller status");
      }
    } catch (error) {
      console.error("Error updating product bestseller status:", error);
      toast.error("Failed to update product bestseller status");
    }
  };

  const renderBadges = (product: Product) => {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {product.is_featured && (
          <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
            Featured
          </Badge>
        )}
        {product.is_bestseller && (
          <Badge variant="default" className="text-xs bg-orange-100 text-orange-800">
            Bestseller
          </Badge>
        )}
        {!product.is_approved && (
          <Badge variant="destructive" className="text-xs">
            Pending Approval
          </Badge>
        )}
      </div>
    );
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.category?.name && product.category.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Products</h2>
        <Button asChild>
          <Link to="/developer/shopping-controls/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>
      
      <div className="mb-4 relative w-full max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>
                <div className="flex items-center">
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium text-xs">{product.id.slice(0, 8)}...</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.title}</div>
                      {renderBadges(product)}
                    </div>
                  </TableCell>
                  <TableCell>{product.price ? `$${product.price.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>{product.category?.name || 'Uncategorized'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={product.is_approved ? "default" : "secondary"}>
                        {product.is_approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(`/developer/shopping-controls/products/edit/${product.id}`)}
                        title="Edit Product"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleFeature(product.id, product.is_featured || false)}
                        title={product.is_featured ? "Remove from Featured" : "Mark as Featured"}
                        className={product.is_featured ? "bg-blue-50 text-blue-600" : ""}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleBestseller(product.id, product.is_bestseller || false)}
                        title={product.is_bestseller ? "Remove from Bestsellers" : "Mark as Bestseller"}
                        className={product.is_bestseller ? "bg-orange-50 text-orange-600" : ""}
                      >
                        <Trophy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProductsManagement;
