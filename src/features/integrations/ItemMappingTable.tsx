import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ArrowRight,
  Check,
  X,
  Wand2,
  Upload,
  Trash2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface ItemMappingTableProps {
  aggregatorId: Id<"aggregators">;
  storeId: Id<"stores">;
  platform: "swiggy" | "zomato" | "rapido";
}

export const ItemMappingTable = ({
  aggregatorId,
  storeId,
  platform,
}: ItemMappingTableProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "mapped" | "unmapped">("all");

  const itemMappings = useQuery(api.aggregatorMappings.getItemMappings, {
    aggregatorId,
  });

  const menuItems = useQuery(api.menu.getItems, { storeId });

  const updateMapping = useMutation(api.aggregatorMappings.updateItemMapping);
  const deleteMapping = useMutation(api.aggregatorMappings.deleteItemMapping);
  const autoMap = useMutation(api.aggregatorMappings.autoMapByName);
  const importItems = useMutation(api.testWebhooks.importSampleItems);

  const handleMapItem = async (
    mappingId: Id<"aggregatorItemMappings">,
    posItemId: string
  ) => {
    try {
      await updateMapping({
        mappingId,
        posItemId: posItemId as Id<"menuItems">,
        mappingType: "item",
      });
      toast.success("Item mapped successfully");
    } catch (error: any) {
      toast.error("Failed to map item", { description: error.message });
    }
  };

  const handleUnmapItem = async (mappingId: Id<"aggregatorItemMappings">) => {
    try {
      await updateMapping({
        mappingId,
        posItemId: undefined as any,
        posVariationId: undefined as any,
        mappingType: "item",
      });
      toast.success("Mapping removed");
    } catch (error: any) {
      toast.error("Failed to unmap", { description: error.message });
    }
  };

  const handleDeleteMapping = async (mappingId: Id<"aggregatorItemMappings">) => {
    try {
      await deleteMapping({ mappingId });
      toast.success("Mapping deleted");
    } catch (error: any) {
      toast.error("Failed to delete", { description: error.message });
    }
  };

  const handleAutoMap = async () => {
    try {
      const result = await autoMap({ aggregatorId });
      toast.success(
        `Auto-mapped ${result.mappedCount} of ${result.totalUnmapped} unmapped items`
      );
    } catch (error: any) {
      toast.error("Auto-mapping failed", { description: error.message });
    }
  };

  const handleImportSamples = async () => {
    try {
      const result = await importItems({
        storeId,
        aggregatorId,
        platform,
      });
      toast.success(`Imported ${result.created} sample items (${result.total - result.created} already existed)`);
    } catch (error: any) {
      toast.error("Import failed", { description: error.message });
    }
  };

  // Filter and search
  const filteredMappings = (itemMappings || []).filter((mapping) => {
    const matchesSearch =
      search === "" ||
      mapping.aggregatorItemName.toLowerCase().includes(search.toLowerCase()) ||
      mapping.posItem?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "mapped" && mapping.posItemId) ||
      (filter === "unmapped" && !mapping.posItemId);

    return matchesSearch && matchesFilter;
  });

  const mappedCount = (itemMappings || []).filter((m) => m.posItemId).length;
  const totalCount = (itemMappings || []).length;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">
              Item Mappings
            </h3>
            <Badge variant="secondary">
              {mappedCount}/{totalCount} mapped
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportSamples}
              className="gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Samples
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoMap}
              className="gap-1"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Auto Map
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="mapped">Mapped</SelectItem>
              <SelectItem value="unmapped">Unmapped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mapping List */}
      <div className="divide-y max-h-[500px] overflow-y-auto">
        {filteredMappings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {totalCount === 0
                ? "No items imported yet. Click 'Import Samples' to add test items."
                : "No items match your search."}
            </p>
          </div>
        ) : (
          filteredMappings.map((mapping) => (
            <div
              key={mapping._id}
              className="p-3 px-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
            >
              {/* Aggregator Item */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {mapping.aggregatorItemName}
                </p>
                {mapping.aggregatorCategory && (
                  <p className="text-xs text-muted-foreground">
                    {mapping.aggregatorCategory}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

              {/* POS Item Selector */}
              <div className="flex-1 min-w-0">
                {mapping.posItemId ? (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-50 text-green-700 gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {mapping.posItem?.name || "Mapped"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleUnmapItem(mapping._id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    onValueChange={(v) => handleMapItem(mapping._id, v)}
                  >
                    <SelectTrigger className="h-8 text-xs border-orange-200 text-orange-600">
                      <SelectValue placeholder="Select POS item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(menuItems || []).map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          {item.name} - Rs.{item.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0"
                onClick={() => handleDeleteMapping(mapping._id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
