import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  price_per_unit: number;
  stock_quantity: number;
  unit: string;
}

interface ProductManagementProps {
  wholesalerId: string;
}

const ProductManagement = ({ wholesalerId }: ProductManagementProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price_per_unit: "",
    stock_quantity: "",
    unit: "kg",
  });

  useEffect(() => {
    fetchProducts();
  }, [wholesalerId]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("wholesaler_id", wholesalerId)
      .order("category", { ascending: true });

    if (error) {
      toast.error("Failed to fetch products");
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.price_per_unit || !formData.stock_quantity) {
      toast.error("Please fill in all fields");
      return;
    }

    const productData = {
      name: formData.name,
      category: formData.category,
      price_per_unit: parseFloat(formData.price_per_unit),
      stock_quantity: parseInt(formData.stock_quantity),
      unit: formData.unit,
      wholesaler_id: wholesalerId,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast.error("Failed to update product");
        console.error(error);
      } else {
        toast.success("Product updated successfully");
        fetchProducts();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert([productData]);

      if (error) {
        toast.error("Failed to add product");
        console.error(error);
      } else {
        toast.success("Product added successfully");
        fetchProducts();
        resetForm();
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price_per_unit: product.price_per_unit.toString(),
      stock_quantity: product.stock_quantity.toString(),
      unit: product.unit,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      toast.error("Failed to delete product");
      console.error(error);
    } else {
      toast.success("Product deleted successfully");
      fetchProducts();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      price_per_unit: "",
      stock_quantity: "",
      unit: "kg",
    });
    setEditingProduct(null);
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Products</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "Update product details" : "Add a new product to your inventory"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Tomatoes"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Vegetables"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Unit</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                      <SelectItem value="units">units</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? "Update" : "Add"} Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No products yet. Add your first product to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 text-foreground">{category}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryProducts.map((product) => (
                  <Card key={product.id}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-semibold">
                        {product.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-semibold">
                            ₹{product.price_per_unit.toFixed(2)}/{product.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Stock:</span>
                          <span className={product.stock_quantity > 0 ? "text-success" : "text-destructive"}>
                            {product.stock_quantity} {product.unit}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductManagement;