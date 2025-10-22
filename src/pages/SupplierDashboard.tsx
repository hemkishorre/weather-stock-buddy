import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, LogOut, Package, ShoppingCart, User as UserIcon } from "lucide-react";
import { User } from "@supabase/supabase-js";
import ProductManagement from "@/components/ProductManagement";
import SupplierOrders from "@/components/SupplierOrders";
import ProfileEdit from "@/components/ProfileEdit";

interface Profile {
  business_name: string;
}

interface Wholesaler {
  id: string;
  name: string;
  location: string;
}

const SupplierDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wholesaler, setWholesaler] = useState<Wholesaler | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is a vendor and redirect to vendor dashboard
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData?.role === "vendor") {
        navigate("/dashboard");
        return;
      }

      setUser(session.user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("business_name")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch wholesaler data
      const { data: wholesalerData } = await supabase
        .from("wholesalers")
        .select("id, name, location")
        .eq("user_id", session.user.id)
        .single();

      if (wholesalerData) {
        setWholesaler(wholesalerData);
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-subtle">
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="gradient-card border-0 shadow-card backdrop-blur-sm sticky top-0 z-50 mb-6 p-6 rounded-lg animate-fade-in">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg gradient-secondary shadow-glow-accent animate-float">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
                  {profile?.business_name || "Supplier Dashboard"}
                </h1>
                <p className="text-muted-foreground">Manage your inventory and orders</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="hover-lift">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {!wholesaler ? (
          <Card className="gradient-card border-0 shadow-card animate-fade-in">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Setting up your supplier account...
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="products" className="space-y-4 animate-slide-up">
            <TabsList className="grid w-full grid-cols-3 gradient-card border-0 shadow-card p-1">
              <TabsTrigger value="products" className="data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow-primary transition-all">
                <Package className="w-4 h-4 mr-2" />
                My Products
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:gradient-secondary data-[state=active]:text-white data-[state=active]:shadow-glow-accent transition-all">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:gradient-success data-[state=active]:text-white data-[state=active]:shadow-glow-success transition-all">
                <UserIcon className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <ProductManagement wholesalerId={wholesaler.id} />
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <SupplierOrders wholesalerId={wholesaler.id} />
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              {user && <ProfileEdit userId={user.id} />}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;