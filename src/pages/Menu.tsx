import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Filter,
  Bike,
  Car,
  Zap,
  Circle,
  MoreVertical
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { MenuItemDialog } from "@/features/menu/MenuItemDialog";

export default function Menu() {
  const storeId = localStorage.getItem("pinpos_store_id");
  
  const categories = useQuery(api.menu.getCategories, storeId ? { storeId: storeId as Id<"stores"> } : "skip") || [];
  const items = useQuery(api.menu.getItems, storeId ? { storeId: storeId as Id<"stores"> } : "skip") || [];
  
  const toggleItemAvailability = useMutation(api.menu.toggleAvailability);
  const toggleCategoryAvailability = useMutation(api.menu.toggleCategoryAvailability);
  const updateOnlineAvailability = useMutation(api.menu.updateOnlineAvailability);
  const createItem = useMutation(api.menu.createItem);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || item.categoryId === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleToggleCategory = async (categoryId: Id<"menuCategories">, status: boolean) => {
    try {
      await toggleCategoryAvailability({ categoryId, isAvailable: status });
      toast.success(`Category ${status ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      toast.error("Failed to update category status");
    }
  };

  const handleToggleItem = async (itemId: Id<"menuItems">, status: boolean) => {
    try {
      await toggleItemAvailability({ itemId, isAvailable: status });
      toast.success(`Item ${status ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      toast.error("Failed to update item status");
    }
  };

  const handleTogglePlatform = async (itemId: Id<"menuItems">, platform: "swiggy" | "zomato" | "rapido", status: boolean) => {
    try {
      await updateOnlineAvailability({ itemId, platform, isAvailable: status });
      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} ${status ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      toast.error(`Failed to update ${platform} status`);
    }
  };

  const handleCreateItem = async (itemData: {
    name: string;
    shortCode?: string;
    shortCode2?: string;
    description?: string;
    price: number;
    hsnCode?: string;
    unit?: string;
    categoryId: Id<"menuCategories">;
    type: "veg" | "non_veg" | "egg";
    orderTypes: string[];
    ignoreTax: boolean;
    ignoreDiscount: boolean;
    isAvailable: boolean;
    areaWisePricing?: { homeWebsite?: number; parcel?: number; swiggy?: number; zomato?: number; rapido?: number };
  }) => {
    if (!storeId) {
      toast.error("No store selected");
      return;
    }
    
    try {
      await createItem({
        storeId: storeId as Id<"stores">,
        ...itemData,
      });
      toast.success("Item added successfully");
    } catch (error) {
      toast.error("Failed to add item");
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "veg": return "bg-green-100 text-green-800 border-green-200";
      case "non_veg": return "bg-red-100 text-red-800 border-red-200";
      case "egg": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">Manage your store menu, stock availability, and online aggregators.</p>
        </div>
        <MenuItemDialog categories={categories} onSubmit={handleCreateItem} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3">
              <Button 
                variant={activeTab === "all" ? "default" : "ghost"} 
                className="w-full justify-start h-10"
                onClick={() => setActiveTab("all")}
              >
                All Items
              </Button>
              {categories.map((cat) => (
                <div key={cat._id} className="flex items-center group">
                  <Button 
                    variant={activeTab === cat._id ? "default" : "ghost"} 
                    className="flex-1 justify-start h-10"
                    onClick={() => setActiveTab(cat._id)}
                  >
                    {cat.name}
                  </Button>
                  <div className="flex items-center px-2">
                    <Switch 
                      checked={cat.isAvailable}
                      onCheckedChange={(checked: boolean) => handleToggleCategory(cat._id, checked)}
                      className="scale-75"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold text-sm">Quick Status</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Items</span>
                  <span className="font-medium">{items.filter(i => i.isAvailable).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Out of Stock</span>
                  <span className="font-medium text-destructive">{items.filter(i => !i.isAvailable).length}</span>
                </div>
                <div className="border-t pt-2 mt-2 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Platform Sync</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Swiggy</span>
                    <span className="font-medium text-orange-600 text-xs">{items.filter(i => i.onlineAvailability.swiggy).length}/{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Zomato</span>
                    <span className="font-medium text-red-600 text-xs">{items.filter(i => i.onlineAvailability.zomato).length}/{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Rapido</span>
                    <span className="font-medium text-yellow-600 text-xs">{items.filter(i => (i.onlineAvailability as any).rapido).length}/{items.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products by name..." 
                  className="pl-9 h-11"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <Card key={item._id} className={`overflow-hidden transition-all hover:shadow-md ${!item.isAvailable ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                <div className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeBadgeColor(item.type)} variant="outline">
                          <Circle className="w-2 h-2 fill-current mr-1" />
                          {item.type.replace("_", " ").toUpperCase()}
                        </Badge>
                        <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description || "No description provided."}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">₹{item.price}</p>
                      {item.areaWisePricing && (item.areaWisePricing.swiggy || item.areaWisePricing.zomato || item.areaWisePricing.rapido) && (
                        <div className="flex flex-col items-end gap-0.5 mt-1">
                          {item.areaWisePricing.swiggy && (
                            <span className="text-[10px] text-orange-600">Swiggy: ₹{item.areaWisePricing.swiggy}</span>
                          )}
                          {item.areaWisePricing.zomato && (
                            <span className="text-[10px] text-red-600">Zomato: ₹{item.areaWisePricing.zomato}</span>
                          )}
                          {item.areaWisePricing.rapido && (
                            <span className="text-[10px] text-yellow-600">Rapido: ₹{item.areaWisePricing.rapido}</span>
                          )}
                        </div>
                      )}
                      <Badge variant="secondary" className="mt-1">
                        {categories.find(c => c._id === item.categoryId)?.name || "Uncategorized"}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Inventory</span>
                        <Switch 
                          checked={item.isAvailable}
                          onCheckedChange={(checked: boolean) => handleToggleItem(item._id, checked)}
                        />
                      </div>
                      
                      <div className="h-8 w-px bg-border" />

                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Swiggy</span>
                        <Button 
                          variant={item.onlineAvailability.swiggy ? "default" : "outline"}
                          size="icon"
                          className={`w-8 h-8 ${item.onlineAvailability.swiggy ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                          onClick={() => handleTogglePlatform(item._id, "swiggy", !item.onlineAvailability.swiggy)}
                        >
                          <Bike className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Zomato</span>
                        <Button
                          variant={item.onlineAvailability.zomato ? "default" : "outline"}
                          size="icon"
                          className={`w-8 h-8 ${item.onlineAvailability.zomato ? 'bg-red-500 hover:bg-red-600' : ''}`}
                          onClick={() => handleTogglePlatform(item._id, "zomato", !item.onlineAvailability.zomato)}
                        >
                          <Car className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Rapido</span>
                        <Button
                          variant={(item.onlineAvailability as any).rapido ? "default" : "outline"}
                          size="icon"
                          className={`w-8 h-8 ${(item.onlineAvailability as any).rapido ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                          onClick={() => handleTogglePlatform(item._id, "rapido", !(item.onlineAvailability as any).rapido)}
                        >
                          <Zap className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-medium">No menu items found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
