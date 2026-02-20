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
  Upload,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";

interface CategoryMappingTableProps {
  aggregatorId: Id<"aggregators">;
  storeId: Id<"stores">;
  platform: "swiggy" | "zomato" | "rapido";
}

export const CategoryMappingTable = ({
  aggregatorId,
  storeId,
  platform,
}: CategoryMappingTableProps) => {
  const [search, setSearch] = useState("");

  const categoryMappings = useQuery(api.aggregatorMappings.getCategoryMappings, {
    aggregatorId,
  });

  const counters = useQuery(api.counters.getByStore, { storeId });

  const updateMapping = useMutation(api.aggregatorMappings.updateCategoryMapping);
  const deleteMapping = useMutation(api.aggregatorMappings.deleteCategoryMapping);
  const importCategories = useMutation(api.testWebhooks.importSampleCategories);

  const handleMapCategory = async (
    mappingId: Id<"aggregatorCategoryMappings">,
    counterId: string
  ) => {
    try {
      await updateMapping({
        mappingId,
        counterId: counterId as Id<"counters">,
      });
      toast.success("Category mapped to counter");
    } catch (error: any) {
      toast.error("Failed to map category", { description: error.message });
    }
  };

  const handleUnmap = async (mappingId: Id<"aggregatorCategoryMappings">) => {
    try {
      await updateMapping({
        mappingId,
        counterId: undefined as any,
      });
      toast.success("Mapping removed");
    } catch (error: any) {
      toast.error("Failed to unmap", { description: error.message });
    }
  };

  const handleDelete = async (mappingId: Id<"aggregatorCategoryMappings">) => {
    try {
      await deleteMapping({ mappingId });
      toast.success("Category mapping deleted");
    } catch (error: any) {
      toast.error("Failed to delete", { description: error.message });
    }
  };

  const handleImportSamples = async () => {
    try {
      const result = await importCategories({
        storeId,
        aggregatorId,
        platform,
      });
      toast.success(`Imported ${result.created} sample categories`);
    } catch (error: any) {
      toast.error("Import failed", { description: error.message });
    }
  };

  const filteredMappings = (categoryMappings || []).filter((mapping) => {
    return (
      search === "" ||
      mapping.aggregatorCategoryName.toLowerCase().includes(search.toLowerCase()) ||
      mapping.counter?.name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const mappedCount = (categoryMappings || []).filter((m) => m.counterId).length;
  const totalCount = (categoryMappings || []).length;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">Category to Counter Mappings</h3>
            <Badge variant="secondary">
              {mappedCount}/{totalCount} mapped
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleImportSamples}
            className="gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Samples
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Mapping List */}
      <div className="divide-y max-h-[500px] overflow-y-auto">
        {filteredMappings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {totalCount === 0
                ? "No categories imported yet. Click 'Import Samples' to add test categories."
                : "No categories match your search."}
            </p>
          </div>
        ) : (
          filteredMappings.map((mapping) => (
            <div
              key={mapping._id}
              className="p-3 px-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
            >
              {/* Aggregator Category */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {mapping.aggregatorCategoryName}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {mapping.aggregatorCategoryId}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

              {/* Counter Selector */}
              <div className="flex-1 min-w-0">
                {mapping.counterId ? (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-50 text-green-700 gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {mapping.counter?.name || "Mapped"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleUnmap(mapping._id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    onValueChange={(v) => handleMapCategory(mapping._id, v)}
                  >
                    <SelectTrigger className="h-8 text-xs border-orange-200 text-orange-600">
                      <SelectValue placeholder="Select counter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(counters || []).map((counter) => (
                        <SelectItem key={counter._id} value={counter._id}>
                          {counter.name}
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
                onClick={() => handleDelete(mapping._id)}
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
