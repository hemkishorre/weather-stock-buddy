import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    name: string;
    unit: string;
  };
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  estimated_delivery: string | null;
  profiles: {
    business_name: string;
  };
  order_items: OrderItem[];
}

interface SupplierOrdersProps {
  wholesalerId: string;
}

const SupplierOrders = ({ wholesalerId }: SupplierOrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [wholesalerId]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_amount,
        created_at,
        estimated_delivery,
        vendor_id,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          products (
            name,
            unit
          )
        )
      `)
      .eq("wholesaler_id", wholesalerId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch orders");
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch vendor profiles separately
    const ordersWithProfiles = await Promise.all(
      (data || []).map(async (order) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("business_name")
          .eq("id", order.vendor_id)
          .single();

        return {
          ...order,
          profiles: profile || { business_name: "Unknown Vendor" },
        };
      })
    );

    setOrders(ordersWithProfiles as Order[]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning text-warning-foreground";
      case "confirmed":
        return "bg-primary text-primary-foreground";
      case "completed":
        return "bg-success text-success-foreground";
      case "cancelled":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Orders from Vendors</h2>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No orders yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {order.profiles.business_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ordered on {format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <h4 className="font-semibold text-sm mb-2">Order Items:</h4>
                    <div className="space-y-2">
                      {order.order_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span>
                            {item.products.name} × {item.quantity} {item.products.unit}
                          </span>
                          <span className="font-semibold">
                            ${item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-lg font-bold text-primary">
                      ${order.total_amount?.toFixed(2) || "0.00"}
                    </span>
                  </div>

                  {order.estimated_delivery && (
                    <p className="text-sm text-muted-foreground">
                      Estimated delivery: {format(new Date(order.estimated_delivery), "MMM dd, yyyy")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierOrders;