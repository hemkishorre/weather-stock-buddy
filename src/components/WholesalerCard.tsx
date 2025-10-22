import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Phone, Package } from "lucide-react";

interface Wholesaler {
  id: string;
  name: string;
  location: string;
  contact_phone?: string;
  delivery_time_hours: number;
  productCount?: number;
}

interface WholesalerCardProps {
  wholesaler: Wholesaler;
  onViewProducts: (wholesalerId: string) => void;
}

const WholesalerCard = ({ wholesaler, onViewProducts }: WholesalerCardProps) => {
  return (
    <Card className="shadow-card transition-base hover:shadow-card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{wholesaler.name}</CardTitle>
          <Badge variant="secondary" className="ml-2">
            {wholesaler.delivery_time_hours}h delivery
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{wholesaler.location}</span>
          </div>
          
          {wholesaler.contact_phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{wholesaler.contact_phone}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Estimated delivery: {wholesaler.delivery_time_hours}h</span>
          </div>

          {wholesaler.productCount !== undefined && (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>{wholesaler.productCount} products available</span>
            </div>
          )}
        </div>

        <Button
          onClick={() => onViewProducts(wholesaler.id)}
          className="w-full"
          variant="default"
        >
          View Products
        </Button>
      </CardContent>
    </Card>
  );
};

export default WholesalerCard;
