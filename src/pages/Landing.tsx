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
  return <div className="min-h-screen gradient-subtle">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-6 animate-fade-in">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-full gradient-primary shadow-glow-primary flex items-center justify-center animate-float">
              <CloudRain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Smart Supply Tracker
            </span>
          </div>
          <Button onClick={() => navigate("/auth")} className="hover-lift shadow-button">
            Get Started
          </Button>
        </nav>
      </header>

      <main className="container mx-auto px-4">
        {/* Hero */}
        <section className="text-center py-20 space-y-6 animate-slide-up">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Weather-Smart Supply{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Management
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Track inventory, connect with suppliers, and make data-driven decisions 
            with AI-powered weather insights.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate("/auth")} className="gradient-primary hover-lift shadow-glow-primary">
              Start for Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="hover-lift border-2">
              Sign In
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12 animate-fade-in">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Manage Your Supply Chain
            </span>
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="card-interactive gradient-card border-0 shadow-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl gradient-primary shadow-glow-primary flex items-center justify-center mb-4">
                  <CloudRain className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle>Weather Integration</CardTitle>
                <CardDescription>
                  Real-time weather data helps predict demand and optimize inventory levels
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-interactive gradient-card border-0 shadow-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl gradient-secondary shadow-glow-accent flex items-center justify-center mb-4">
                  <TrendingUp className="w-7 h-7 text-secondary-foreground" />
                </div>
                <CardTitle>AI Predictions</CardTitle>
                <CardDescription>
                  Get intelligent recommendations based on weather patterns and inventory needs
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-interactive gradient-card border-0 shadow-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl gradient-success shadow-glow-success flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-success-foreground" />
                </div>
                <CardTitle>Supplier Network</CardTitle>
                <CardDescription>
                  Connect with verified suppliers and manage orders seamlessly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-interactive gradient-card border-0 shadow-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl gradient-primary shadow-glow-primary flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle>Inventory Tracking</CardTitle>
                <CardDescription>
                  Track your inventory needs and get alerts when stock is low
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-interactive gradient-card border-0 shadow-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl gradient-secondary shadow-glow-accent flex items-center justify-center mb-4">
                  <ShoppingCart className="w-7 h-7 text-secondary-foreground" />
                </div>
                <CardTitle>Easy Ordering</CardTitle>
                <CardDescription>
                  Place orders quickly and track delivery status in real-time
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-interactive gradient-card border-0 shadow-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl gradient-success shadow-glow-success flex items-center justify-center mb-4">
                  <Zap className="w-7 h-7 text-success-foreground" />
                </div>
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
          <Card className="card-interactive gradient-card border-0 shadow-card-hover max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl">
                Ready to{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Get Started?
                </span>
              </CardTitle>
              <CardDescription className="text-lg">
                Join vendors and suppliers already using Smart Supply Tracker
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="w-full md:w-auto gradient-primary hover-lift shadow-glow-primary"
              >
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