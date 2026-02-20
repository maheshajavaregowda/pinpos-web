import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { 
  Store 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StoreSwitcher() {
  const userId = localStorage.getItem("pinpos_user_id");
  const stores = useQuery(api.stores.getAccessibleStores, { userId: userId as any }) || []; 
  const currentStoreId = localStorage.getItem("pinpos_store_id");
  const currentStore = stores.find((s) => s?._id === currentStoreId) || stores[0];

  const onStoreSelect = (storeId: string) => {
    localStorage.setItem("pinpos_store_id", storeId);
    window.location.reload(); 
  };

  if (!stores.length) {
    return <div className="w-[250px] h-10 bg-muted animate-pulse rounded-md" />;
  }

  return (
    <Select value={currentStore?._id} onValueChange={onStoreSelect}>
      <SelectTrigger className="w-[250px] h-10 border-border bg-background hover:bg-muted">
        <div className="flex items-center gap-2 overflow-hidden">
          <Store className="h-4 w-4 shrink-0 opacity-50" />
          <SelectValue placeholder="Select Store" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store?._id} value={store?._id!}>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span>{store?.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
