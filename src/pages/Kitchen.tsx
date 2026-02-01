import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Id } from "@convex/_generated/dataModel";
import { ChefHat, Clock, CheckCircle, Loader2 } from "lucide-react";

export default function Kitchen() {
  const store = useQuery(api.seed.getFirstStore);
  const orders = useQuery(
    api.orders.getByStoreAndStatus,
    store ? { storeId: store._id, statuses: ["pending", "confirmed", "cooking"] } : "skip"
  );
  const updateStatus = useMutation(api.orders.updateStatus);

  const handleStatusChange = async (orderId: Id<"orders">, newStatus: string) => {
    await updateStatus({ orderId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "border-yellow-500 bg-yellow-50",
      confirmed: "border-blue-500 bg-blue-50",
      cooking: "border-orange-500 bg-orange-50",
    };
    return colors[status] || "border-gray-300";
  };

  if (store === undefined || orders === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (store === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-muted-foreground">No store found. Please set up your store first.</p>
        <Button asChild className="mt-4">
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kitchen Display</h1>
            <p className="text-muted-foreground">{store.name} • Real-time order updates</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <a href="/dashboard">Back to Dashboard</a>
        </Button>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <p className="mt-4 text-xl font-medium">All caught up!</p>
          <p className="text-muted-foreground">No pending orders right now.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {orders.map((order) => (
            <Card key={order._id} className={`border-2 ${getStatusColor(order.status)}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">#{order.orderNumber}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {order.type.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(order.createdAt).toLocaleTimeString()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Badge
                    className={
                      order.status === "pending"
                        ? "bg-yellow-500"
                        : order.status === "cooking"
                        ? "bg-orange-500"
                        : "bg-blue-500"
                    }
                  >
                    {order.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  {order.status === "pending" && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStatusChange(order._id, "cooking")}
                    >
                      Start Cooking
                    </Button>
                  )}
                  {order.status === "cooking" && (
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange(order._id, "ready")}
                    >
                      Mark Ready
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
