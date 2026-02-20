import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Settings2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  ShoppingCart,
} from "lucide-react";

interface AggregatorCardProps {
  aggregator: {
    _id: Id<"aggregators">;
    platform: string;
    isEnabled: boolean;
    status: string;
    lastSyncAt?: number;
    credentials: {
      apiKey?: string;
      restaurantId?: string;
    };
  };
  platformConfig: {
    name: string;
    color: string;
    bgColor: string;
    borderColor: string;
  };
  onToggle: () => void;
  onConfigure: () => void;
  onMapItems: () => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  inactive: <XCircle className="w-4 h-4 text-gray-400" />,
  error: <AlertTriangle className="w-4 h-4 text-red-500" />,
};

const statusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  error: "Error",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  error: "bg-red-100 text-red-700",
};

export const AggregatorCard = ({
  aggregator,
  platformConfig,
  onToggle,
  onConfigure,
  onMapItems,
}: AggregatorCardProps) => {
  const stats = useQuery(api.aggregators.getStats, {
    aggregatorId: aggregator._id,
  });

  return (
    <Card className={`overflow-hidden ring-1 ring-gray-100 hover:shadow-md transition-shadow`}>
      {/* Top color bar */}
      <div className={`h-1.5 ${platformConfig.bgColor}`} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${platformConfig.bgColor} rounded-xl flex items-center justify-center`}>
              <span className={`text-lg font-bold ${platformConfig.color}`}>
                {platformConfig.name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{platformConfig.name}</h3>
              <Badge variant="secondary" className={`text-xs ${statusColors[aggregator.status]}`}>
                {statusIcons[aggregator.status]}
                <span className="ml-1">{statusLabels[aggregator.status]}</span>
              </Badge>
            </div>
          </div>
          <Switch
            checked={aggregator.isEnabled}
            onCheckedChange={onToggle}
          />
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Package className="w-3 h-3" />
                Items Mapped
              </div>
              <p className="text-lg font-bold">
                {stats.mappedItems}
                <span className="text-sm text-muted-foreground font-normal">
                  /{stats.totalItems}
                </span>
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ShoppingCart className="w-3 h-3" />
                Orders Today
              </div>
              <p className="text-lg font-bold">
                {stats.ordersToday}
                {stats.pendingOrders > 0 && (
                  <span className="text-sm text-orange-500 font-normal ml-1">
                    ({stats.pendingOrders} pending)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Restaurant ID */}
        {aggregator.credentials.restaurantId && (
          <div className="text-xs text-muted-foreground">
            Restaurant ID: <span className="font-mono">{aggregator.credentials.restaurantId}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={onConfigure}
          >
            <Settings2 className="w-4 h-4" />
            Configure
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={onMapItems}
          >
            <ArrowRight className="w-4 h-4" />
            Map Items
          </Button>
        </div>
      </div>
    </Card>
  );
};
