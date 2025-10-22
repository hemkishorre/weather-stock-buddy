import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Minus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  price_per_unit: number;
  stock_quantity: number;
}

interface ProductListProps {
  wholesalerId: string;
  onAddToCart: (productId: string, quantity: number, price: number) => void;
}

const ProductList = ({ wholesalerId, onAddToCart }: ProductListProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("wholesaler_id", wholesalerId)
          .order("category", { ascending: true });

        if (error) throw error;
        setProducts(data || []);
      } catch (error: any) {
        toast.error("Failed to load products");
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [wholesalerId]);

  const handleQuantityChange = (productId: string, change: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + change),
    }));
  };

  const handleAddToCart = (product: Product) => {
    const quantity = quantities[product.id] || 0;
    if (quantity <= 0) {
      toast.error("Please select a quantity");
      return;
    }
    if (quantity > product.stock_quantity) {
      toast.error("Quantity exceeds available stock");
      return;
    }
    
    onAddToCart(product.id, quantity, product.price_per_unit);
    setQuantities((prev) => ({ ...prev, [product.id]: 0 }));
    toast.success(`Added ${quantity} ${product.unit} of ${product.name} to cart`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No products available from this wholesaler</p>
        </CardContent>
      </Card>
    );
  }

  // Group products by category
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {category}
            <Badge variant="secondary">{categoryProducts.length} items</Badge>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoryProducts.map((product) => (
              <Card key={product.id} className="shadow-card transition-base hover:shadow-card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary">
                      ₹{product.price_per_unit}
                    </span>
                    <span className="text-sm text-muted-foreground">per {product.unit}</span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Stock: {product.stock_quantity} {product.unit}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleQuantityChange(product.id, -1)}
                      disabled={!quantities[product.id] || quantities[product.id] <= 0}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      max={product.stock_quantity}
                      value={quantities[product.id] || 0}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [product.id]: Math.max(0, Math.min(product.stock_quantity, parseInt(e.target.value) || 0)),
                        }))
                      }
                      className="text-center"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleQuantityChange(product.id, 1)}
                      disabled={quantities[product.id] >= product.stock_quantity}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={() => handleAddToCart(product)}
                    className="w-full"
                    disabled={!quantities[product.id] || quantities[product.id] <= 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Order
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
