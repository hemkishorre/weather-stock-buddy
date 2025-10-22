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
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWholesaler, setSelectedWholesaler] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [showProductDialog, setShowProductDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
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

      setLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
  };

  const handleViewProducts = (wholesalerId: string) => {
    setSelectedWholesaler(wholesalerId);
    setShowProductDialog(true);
  };

  const handleAddToCart = (productId: string, quantity: number, unitPrice: number) => {
    setCart((prev) => ({
      ...prev,
      [productId]: { productId, quantity, unitPrice },
    }));
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
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full text-xs flex items-center justify-center text-white">
                  2
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
        <Tabs defaultValue="overview" className="space-y-6">
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
                    onClick={() => document.querySelector('[value="wholesalers"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Browse Products
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Weather Widget */}
            <WeatherWidget />

            {/* AI Suggestions Card */}
            <Card className="shadow-card bg-gradient-to-br from-success/5 to-success/10 border-success/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  AI Supply Suggestions
                </CardTitle>
                <CardDescription>
                  Based on weather forecast and typical demand patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-success mt-2"></div>
                  <div>
                    <p className="font-medium">Fresh Vegetables</p>
                    <p className="text-sm text-muted-foreground">
                      Stock up on tomatoes, lettuce, and onions - pleasant weather increases demand
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-success mt-2"></div>
                  <div>
                    <p className="font-medium">Dairy Products</p>
                    <p className="text-sm text-muted-foreground">
                      Consider increasing milk and cheese orders by 15%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                <p className="text-center text-muted-foreground py-12">
                  No orders yet. Start ordering from wholesalers to see your history here.
                </p>
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
