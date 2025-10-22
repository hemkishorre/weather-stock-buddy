import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, LogOut, Loader2, Store, Package, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import WeatherWidget from "@/components/WeatherWidget";
import WholesalerCard from "@/components/WholesalerCard";
import ProductList from "@/components/ProductList";
import InventoryNeedsInput from "@/components/InventoryNeedsInput";
import AISuggestionsEnhanced from "@/components/AISuggestionsEnhanced";

interface Wholesaler {
  id: string;
  name: string;
  location: string;
  contact_phone?: string;
  delivery_time_hours: number;
}

interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  wholesalerId: string;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  wholesalers: {
    name: string;
  };
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWholesaler, setSelectedWholesaler] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is a supplier and redirect to supplier dashboard
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData?.role === "supplier") {
        navigate("/supplier-dashboard");
        return;
      }

      setUser(session.user);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      setProfile(profileData);

      // Fetch wholesalers
      const { data: wholesalersData, error } = await supabase
        .from("wholesalers")
        .select("*")
        .order("name");

      if (!error && wholesalersData) {
        setWholesalers(wholesalersData);
      }

      // Fetch user orders
      await fetchOrders(session.user.id);

      setLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleViewProducts = (wholesalerId: string) => {
    setSelectedWholesaler(wholesalerId);
    setShowProductDialog(true);
  };

  const fetchOrders = async (userId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_amount,
        created_at,
        wholesalers (
          name
        )
      `)
      .eq("vendor_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
  };

  const handleAddToCart = (productId: string, quantity: number, unitPrice: number, wholesalerId?: string) => {
    const finalWholesalerId = wholesalerId || selectedWholesaler;
    if (!finalWholesalerId) return;
    
    setCart((prev) => ({
      ...prev,
      [productId]: { productId, quantity, unitPrice, wholesalerId: finalWholesalerId },
    }));
    toast.success("Added to cart");
  };

  const handlePlaceOrder = async () => {
    if (Object.keys(cart).length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to place an order");
      return;
    }

    setPlacingOrder(true);

    try {
      // Group cart items by wholesaler
      const itemsByWholesaler: Record<string, CartItem[]> = {};
      Object.values(cart).forEach((item) => {
        if (!itemsByWholesaler[item.wholesalerId]) {
          itemsByWholesaler[item.wholesalerId] = [];
        }
        itemsByWholesaler[item.wholesalerId].push(item);
      });

      // Create an order for each wholesaler
      for (const [wholesalerId, items] of Object.entries(itemsByWholesaler)) {
        const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

        // Create order
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            vendor_id: user.id,
            wholesaler_id: wholesalerId,
            total_amount: totalAmount,
            status: "pending",
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = items.map((item) => ({
          order_id: orderData.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      toast.success("Order placed successfully!");
      setCart({});
      setShowProductDialog(false);
      await fetchOrders(user.id);
    } catch (error: any) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order: " + error.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const cartItemCount = Object.keys(cart).length;
  const cartTotal = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Smart Supply Tracker</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.business_name || "Your Business"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cartItemCount > 0 && (
                <Button onClick={handlePlaceOrder} disabled={placingOrder}>
                  {placingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Place Order ({cartItemCount})
                    </>
                  )}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full text-xs flex items-center justify-center text-white">
                  {cartItemCount}
                </span>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="wholesalers">Find Suppliers</TabsTrigger>
            <TabsTrigger value="orders">My Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cart Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cartItemCount}</div>
                  <p className="text-xs text-muted-foreground">
                    ${cartTotal.toFixed(2)} total
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Available Suppliers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{wholesalers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready to serve you
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Quick Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveTab("wholesalers")}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Browse Products
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Weather Widget */}
            <WeatherWidget />

            {/* Inventory Needs Input */}
            <InventoryNeedsInput />

            {/* AI Suggestions */}
            <AISuggestionsEnhanced onAddToCart={handleAddToCart} />
          </TabsContent>

          <TabsContent value="wholesalers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Wholesalers</CardTitle>
                <CardDescription>
                  Browse and order from nearby suppliers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {wholesalers.map((wholesaler) => (
                    <WholesalerCard
                      key={wholesaler.id}
                      wholesaler={wholesaler}
                      onViewProducts={handleViewProducts}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View your past and pending orders</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    No orders yet. Start ordering from suppliers to see your history here.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">{order.wholesalers.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${order.total_amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {order.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Products Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {wholesalers.find((w) => w.id === selectedWholesaler)?.name} - Products
            </DialogTitle>
          </DialogHeader>
          {selectedWholesaler && (
            <ProductList
              wholesalerId={selectedWholesaler}
              onAddToCart={handleAddToCart}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
