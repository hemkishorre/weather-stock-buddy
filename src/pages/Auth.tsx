import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationSearch } from "@/components/LocationSearch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CloudRain } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters" }).optional(),
  role: z.enum(["vendor", "supplier"]).optional(),
  phone: z.string().min(10, { message: "Phone number must be at least 10 characters" }).optional(),
  location: z.string().min(3, { message: "Location must be at least 3 characters" }).optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState<"vendor" | "supplier">("vendor");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    try {
      authSchema.parse({
        email,
        password,
        businessName: isLogin ? undefined : businessName,
        role: isLogin ? undefined : role,
        phone: isLogin ? undefined : phone,
        location: isLogin ? undefined : location,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (data.session) {
          // Check user role to redirect appropriately
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.session.user.id)
            .single();

          toast.success("Welcome back!");
          
          if (roleData?.role === "supplier") {
            navigate("/supplier-dashboard");
          } else {
            navigate("/dashboard");
          }
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              business_name: businessName,
              role: role,
              contact_phone: phone,
              location: location,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please login instead.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (data.session) {
          toast.success("Account created! Welcome!");
          
          // Redirect based on role
          if (role === "supplier") {
            navigate("/supplier-dashboard");
          } else {
            navigate("/dashboard");
          }
        } else {
          toast.success("Account created! You can now log in.");
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <Card className="w-full max-w-md gradient-card border-0 shadow-card-hover backdrop-blur-sm animate-scale-in relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full gradient-primary shadow-glow-primary flex items-center justify-center animate-pulse-glow">
              <CloudRain className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            {isLogin ? "Welcome Back" : "Get Started"}
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin
              ? "Sign in to manage your inventory"
              : "Create your account to start tracking supplies"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-semibold">Account Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`relative flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      role === "vendor" 
                        ? "gradient-primary border-primary shadow-glow-primary text-white" 
                        : "border-border bg-card hover:border-primary/50"
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="vendor"
                        checked={role === "vendor"}
                        onChange={(e) => setRole(e.target.value as "vendor" | "supplier")}
                        disabled={loading}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold">🏪 Vendor</span>
                    </label>
                    <label className={`relative flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      role === "supplier" 
                        ? "gradient-secondary border-secondary shadow-glow-accent text-white" 
                        : "border-border bg-card hover:border-secondary/50"
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="supplier"
                        checked={role === "supplier"}
                        onChange={(e) => setRole(e.target.value as "vendor" | "supplier")}
                        disabled={loading}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold">📦 Supplier</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Your Business"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required={!isLogin}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 234 567 8900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required={!isLogin}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Address</Label>
                  <LocationSearch
                    value={location}
                    onChange={setLocation}
                    placeholder="Search for your city..."
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vendor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary hover-lift shadow-glow-primary text-white font-semibold text-base h-12"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setBusinessName("");
                  setPhone("");
                  setLocation("");
                  setRole("vendor");
                }}
                className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent hover:opacity-80 transition-opacity font-semibold"
                disabled={loading}
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;