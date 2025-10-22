import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Package } from "lucide-react";

interface InventoryItem {
  id: string;
  item_name: string;
  quantity_needed: number;
  unit: string;
  priority: string;
  notes?: string;
}

const InventoryNeedsInput = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    item_name: "",
    quantity_needed: "",
    unit: "kg",
    priority: "medium",
    notes: ""
  });

  useEffect(() => {
    fetchInventoryNeeds();
  }, []);

  const fetchInventoryNeeds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("inventory_needs")
        .select("*")
        .eq("vendor_id", user.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory needs");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.item_name || !newItem.quantity_needed) {
      toast.error("Please fill in item name and quantity");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to add items");
        return;
      }

      const { error } = await supabase
        .from("inventory_needs")
        .insert({
          vendor_id: user.id,
          item_name: newItem.item_name,
          quantity_needed: parseFloat(newItem.quantity_needed),
          unit: newItem.unit,
          priority: newItem.priority,
          notes: newItem.notes || null
        });

      if (error) throw error;

      toast.success("Item added to inventory needs");
      setNewItem({
        item_name: "",
        quantity_needed: "",
        unit: "kg",
        priority: "medium",
        notes: ""
      });
      fetchInventoryNeeds();
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("inventory_needs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Item removed");
      fetchInventoryNeeds();
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast.error("Failed to remove item");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-muted-foreground";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Inventory Needs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Inventory Needs
        </CardTitle>
        <CardDescription>
          Add items you need to order and AI will provide smart suggestions based on weather
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Item Form */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                placeholder="e.g., Tomatoes"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  placeholder="10"
                  value={newItem.quantity_needed}
                  onChange={(e) => setNewItem({ ...newItem, quantity_needed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={newItem.unit} onValueChange={(value) => setNewItem({ ...newItem, unit: value })}>
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="liter">liter</SelectItem>
                    <SelectItem value="pieces">pieces</SelectItem>
                    <SelectItem value="boxes">boxes</SelectItem>
                    <SelectItem value="bags">bags</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={newItem.priority} onValueChange={(value) => setNewItem({ ...newItem, priority: value })}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Any special requirements"
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleAddItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Current Items List */}
        {items.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Needs ({items.length})</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.item_name}</p>
                      <span className={`text-xs font-semibold uppercase ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity_needed} {item.unit}
                      {item.notes && ` • ${item.notes}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No inventory items added yet</p>
            <p className="text-sm">Add items above to get AI-powered suggestions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryNeedsInput;
