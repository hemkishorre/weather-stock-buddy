import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudRain, Package, ShoppingCart, TrendingUp, Users, Zap } from "lucide-react";
const Landing = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session) {
        // Check user role to redirect appropriately
        const {
          data: roleData
        } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).single();
        if (roleData?.role === "supplier") {
          navigate("/supplier-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkAuth();
  }, [navigate]);
  return <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-success/10">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center bg-sky-500">
              <CloudRain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Smart Supply Tracker</span>
          </div>
          <Button onClick={() => navigate("/auth")}>
            Get Started
          </Button>
        </nav>
      </header>

      <main className="container mx-auto px-4">
        {/* Hero */}
        <section className="text-center py-20 space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground">
            Weather-Smart Supply Management
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track inventory, connect with suppliers, and make data-driven decisions 
            with AI-powered weather insights.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Start for Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Manage Your Supply Chain
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="shadow-card-hover">
              <CardHeader>
                <CloudRain className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Weather Integration</CardTitle>
                <CardDescription>
                  Real-time weather data helps predict demand and optimize inventory levels
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card-hover">
              <CardHeader>
                <TrendingUp className="w-12 h-12 text-primary mb-4" />
                <CardTitle>AI Predictions</CardTitle>
                <CardDescription>
                  Get intelligent recommendations based on weather patterns and inventory needs
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card-hover">
              <CardHeader>
                <Users className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Supplier Network</CardTitle>
                <CardDescription>
                  Connect with verified suppliers and manage orders seamlessly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card-hover">
              <CardHeader>
                <Package className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Inventory Tracking</CardTitle>
                <CardDescription>
                  Track your inventory needs and get alerts when stock is low
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card-hover">
              <CardHeader>
                <ShoppingCart className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Easy Ordering</CardTitle>
                <CardDescription>
                  Place orders quickly and track delivery status in real-time
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card-hover">
              <CardHeader>
                <Zap className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Real-time Updates</CardTitle>
                <CardDescription>
                  Stay informed with instant notifications and order status updates
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </span>
                  For Vendors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  • Sign up and create your business profile
                </p>
                <p className="text-muted-foreground">
                  • Set your location for weather-based insights
                </p>
                <p className="text-muted-foreground">
                  • Browse suppliers and add products to cart
                </p>
                <p className="text-muted-foreground">
                  • Get AI recommendations based on weather and needs
                </p>
                <p className="text-muted-foreground">
                  • Place orders and track delivery status
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </span>
                  For Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  • Register as a supplier with your business details
                </p>
                <p className="text-muted-foreground">
                  • Add your products with prices and stock levels
                </p>
                <p className="text-muted-foreground">
                  • Manage your inventory in real-time
                </p>
                <p className="text-muted-foreground">
                  • Receive orders from vendors automatically
                </p>
                <p className="text-muted-foreground">
                  • Track all orders and customer details
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <Card className="shadow-card-hover max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl">Ready to Get Started?</CardTitle>
              <CardDescription className="text-lg">
                Join vendors and suppliers already using Smart Supply Tracker
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="w-full md:w-auto">
                Create Your Free Account
              </Button>
              <p className="text-sm text-muted-foreground">
                No credit card required • Free to start
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Smart Supply Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>;
};
export default Landing;