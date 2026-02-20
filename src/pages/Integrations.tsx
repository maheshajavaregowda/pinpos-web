import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Link2,
  Store,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { AggregatorCard } from "@/features/integrations/AggregatorCard";
import { CredentialsDialog } from "@/features/integrations/CredentialsDialog";
import { ItemMappingTable } from "@/features/integrations/ItemMappingTable";
import { CategoryMappingTable } from "@/features/integrations/CategoryMappingTable";

type Platform = "swiggy" | "zomato" | "rapido";

const platformConfig: Record<Platform, { name: string; color: string; bgColor: string; borderColor: string }> = {
  swiggy: { name: "Swiggy", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  zomato: { name: "Zomato", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" },
  rapido: { name: "Rapido", color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" },
};

const Integrations = () => {
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const userId = localStorage.getItem("pinpos_user_id");
  const stores = useQuery(api.stores.getAccessibleStores, userId ? { userId: userId as Id<"users"> } : "skip");

  // Auto-select first store
  const effectiveStoreId = selectedStoreId || stores?.[0]?._id;

  const aggregators = useQuery(
    api.aggregators.getByStore,
    effectiveStoreId ? { storeId: effectiveStoreId as Id<"stores"> } : "skip"
  );

  const createAggregator = useMutation(api.aggregators.create);
  const toggleEnabled = useMutation(api.aggregators.toggleEnabled);

  const handleAddAggregator = async (platform: Platform) => {
    if (!effectiveStoreId) return;

    try {
      await createAggregator({
        storeId: effectiveStoreId as Id<"stores">,
        platform,
      });
      toast.success(`${platformConfig[platform].name} aggregator added`);
    } catch (error: any) {
      toast.error("Failed to add aggregator", { description: error.message });
    }
  };

  const handleToggle = async (aggregatorId: Id<"aggregators">) => {
    try {
      const result = await toggleEnabled({ aggregatorId });
      toast.success(result.isEnabled ? "Aggregator enabled" : "Aggregator disabled");
    } catch (error: any) {
      toast.error("Failed to toggle", { description: error.message });
    }
  };

  const handleConfigureClick = (platform: Platform) => {
    setSelectedPlatform(platform);
    setShowCredentials(true);
  };

  const handleMappingClick = (platform: Platform) => {
    setSelectedPlatform(platform);
    setActiveTab("items");
  };

  // Get available platforms that haven't been added yet
  const existingPlatforms = new Set(aggregators?.map((a) => a.platform) || []);
  const availablePlatforms = (["swiggy", "zomato", "rapido"] as Platform[]).filter(
    (p) => !existingPlatforms.has(p)
  );

  const selectedAggregator = aggregators?.find((a) => a.platform === selectedPlatform);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Link2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Online Integrations</h1>
            <p className="text-muted-foreground text-sm">
              Connect with Swiggy, Zomato, and Rapido to receive orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Store Selector */}
          {stores && stores.length > 1 && (
            <Select
              value={effectiveStoreId as string}
              onValueChange={setSelectedStoreId}
            >
              <SelectTrigger className="w-[200px] h-11">
                <Store className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select Store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store._id} value={store._id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Add Aggregator */}
          {availablePlatforms.length > 0 && (
            <Select onValueChange={(v) => handleAddAggregator(v as Platform)}>
              <SelectTrigger className="w-[180px] h-11 bg-orange-600 text-white border-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Add Platform" />
              </SelectTrigger>
              <SelectContent>
                {availablePlatforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platformConfig[platform].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Item Mappings</TabsTrigger>
          <TabsTrigger value="categories">Category Mappings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {!aggregators || aggregators.length === 0 ? (
            <Card className="border-2 border-dashed border-orange-200 rounded-3xl">
              <div className="flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                  <Link2 className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold">No Integrations Yet</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-md">
                  Add Swiggy, Zomato, or Rapido to start receiving online orders directly in your POS
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aggregators.map((aggregator) => (
                <AggregatorCard
                  key={aggregator._id}
                  aggregator={aggregator}
                  platformConfig={platformConfig[aggregator.platform as Platform]}
                  onToggle={() => handleToggle(aggregator._id)}
                  onConfigure={() => handleConfigureClick(aggregator.platform as Platform)}
                  onMapItems={() => handleMappingClick(aggregator.platform as Platform)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Item Mappings Tab */}
        <TabsContent value="items">
          {aggregators && aggregators.length > 0 ? (
            <div className="space-y-4">
              {/* Platform selector for mappings */}
              <div className="flex gap-2">
                {aggregators.map((agg) => (
                  <Button
                    key={agg._id}
                    variant={selectedPlatform === agg.platform ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPlatform(agg.platform as Platform)}
                    className="gap-2"
                  >
                    {platformConfig[agg.platform as Platform].name}
                  </Button>
                ))}
              </div>

              {selectedAggregator ? (
                <ItemMappingTable
                  aggregatorId={selectedAggregator._id}
                  storeId={effectiveStoreId as Id<"stores">}
                  platform={selectedAggregator.platform as Platform}
                />
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  Select a platform above to manage item mappings
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              Add an aggregator first to manage item mappings
            </Card>
          )}
        </TabsContent>

        {/* Category Mappings Tab */}
        <TabsContent value="categories">
          {aggregators && aggregators.length > 0 ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                {aggregators.map((agg) => (
                  <Button
                    key={agg._id}
                    variant={selectedPlatform === agg.platform ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPlatform(agg.platform as Platform)}
                    className="gap-2"
                  >
                    {platformConfig[agg.platform as Platform].name}
                  </Button>
                ))}
              </div>

              {selectedAggregator ? (
                <CategoryMappingTable
                  aggregatorId={selectedAggregator._id}
                  storeId={effectiveStoreId as Id<"stores">}
                  platform={selectedAggregator.platform as Platform}
                />
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  Select a platform above to manage category mappings
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              Add an aggregator first to manage category mappings
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Credentials Dialog */}
      {selectedAggregator && (
        <CredentialsDialog
          open={showCredentials}
          onClose={() => setShowCredentials(false)}
          aggregator={selectedAggregator}
        />
      )}
    </div>
  );
};

export default Integrations;
