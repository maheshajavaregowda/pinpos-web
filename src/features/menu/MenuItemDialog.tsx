import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Leaf, Beef, Egg } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Id } from "@convex/_generated/dataModel";

interface AreaWisePricing {
  homeWebsite?: number;
  parcel?: number;
  swiggy?: number;
  zomato?: number;
  rapido?: number;
}

interface MenuItemFormData {
  name: string;
  shortCode: string;
  shortCode2: string;
  description: string;
  price: string;
  hsnCode: string;
  unit: string;
  categoryId: string;
  foodType: "veg" | "non_veg" | "egg";
  orderTypes: string[];
  ignoreTax: boolean;
  ignoreDiscount: boolean;
  isAvailable: boolean;
  areaWisePricing: {
    homeWebsite: { enabled: boolean; price: string };
    parcel: { enabled: boolean; price: string };
    swiggy: { enabled: boolean; price: string };
    zomato: { enabled: boolean; price: string };
    rapido: { enabled: boolean; price: string };
  };
}

interface Category {
  _id: Id<"menuCategories">;
  name: string;
}

interface MenuItemDialogProps {
  categories: Category[];
  onSubmit: (data: {
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
    areaWisePricing?: AreaWisePricing;
  }) => void;
}

const orderTypeOptions = [
  { id: "dine_in", label: "Dine In" },
  { id: "takeaway", label: "Pick Up" },
  { id: "delivery", label: "Delivery" },
];

const foodTypeOptions = [
  { id: "veg", label: "Veg", icon: Leaf, color: "text-green-600" },
  { id: "non_veg", label: "Non-Veg", icon: Beef, color: "text-red-600" },
  { id: "egg", label: "Egg", icon: Egg, color: "text-yellow-600" },
];

export function MenuItemDialog({ categories, onSubmit }: MenuItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: "",
    shortCode: "",
    shortCode2: "",
    description: "",
    price: "",
    hsnCode: "",
    unit: "",
    categoryId: "",
    foodType: "veg",
    orderTypes: ["dine_in", "takeaway", "delivery"],
    ignoreTax: false,
    ignoreDiscount: false,
    isAvailable: true,
    areaWisePricing: {
      homeWebsite: { enabled: false, price: "" },
      parcel: { enabled: false, price: "" },
      swiggy: { enabled: false, price: "" },
      zomato: { enabled: false, price: "" },
      rapido: { enabled: false, price: "" },
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      shortCode: "",
      shortCode2: "",
      description: "",
      price: "",
      hsnCode: "",
      unit: "",
      categoryId: "",
      foodType: "veg",
      orderTypes: ["dine_in", "takeaway", "delivery"],
      ignoreTax: false,
      ignoreDiscount: false,
      isAvailable: true,
      areaWisePricing: {
        homeWebsite: { enabled: false, price: "" },
        parcel: { enabled: false, price: "" },
        swiggy: { enabled: false, price: "" },
        zomato: { enabled: false, price: "" },
        rapido: { enabled: false, price: "" },
      },
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.price || !formData.categoryId) {
      return;
    }

    const areaWisePricing: AreaWisePricing = {};
    if (formData.areaWisePricing.homeWebsite.enabled && formData.areaWisePricing.homeWebsite.price) {
      areaWisePricing.homeWebsite = parseFloat(formData.areaWisePricing.homeWebsite.price);
    }
    if (formData.areaWisePricing.parcel.enabled && formData.areaWisePricing.parcel.price) {
      areaWisePricing.parcel = parseFloat(formData.areaWisePricing.parcel.price);
    }
    if (formData.areaWisePricing.swiggy.enabled && formData.areaWisePricing.swiggy.price) {
      areaWisePricing.swiggy = parseFloat(formData.areaWisePricing.swiggy.price);
    }
    if (formData.areaWisePricing.zomato.enabled && formData.areaWisePricing.zomato.price) {
      areaWisePricing.zomato = parseFloat(formData.areaWisePricing.zomato.price);
    }
    if (formData.areaWisePricing.rapido.enabled && formData.areaWisePricing.rapido.price) {
      areaWisePricing.rapido = parseFloat(formData.areaWisePricing.rapido.price);
    }

    onSubmit({
      name: formData.name,
      shortCode: formData.shortCode || undefined,
      shortCode2: formData.shortCode2 || undefined,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      hsnCode: formData.hsnCode || undefined,
      unit: formData.unit || undefined,
      categoryId: formData.categoryId as Id<"menuCategories">,
      type: formData.foodType,
      orderTypes: formData.orderTypes,
      ignoreTax: formData.ignoreTax,
      ignoreDiscount: formData.ignoreDiscount,
      isAvailable: formData.isAvailable,
      areaWisePricing: Object.keys(areaWisePricing).length > 0 ? areaWisePricing : undefined,
    });

    resetForm();
    setIsOpen(false);
  };

  const toggleOrderType = (orderType: string) => {
    setFormData(prev => ({
      ...prev,
      orderTypes: prev.orderTypes.includes(orderType)
        ? prev.orderTypes.filter(t => t !== orderType)
        : [...prev.orderTypes, orderType]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Add New Menu Item</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
              
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Cappuccino"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="shortCode" className="text-sm font-medium text-foreground">
                    Short Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shortCode"
                    value={formData.shortCode}
                    onChange={(e) => setFormData({...formData, shortCode: e.target.value})}
                    placeholder="e.g., CAP"
                  />
                </div>
                <div>
                  <Label htmlFor="shortCode2" className="text-sm font-medium text-foreground">Short Code 2</Label>
                  <Input
                    id="shortCode2"
                    value={formData.shortCode2}
                    onChange={(e) => setFormData({...formData, shortCode2: e.target.value})}
                    placeholder="e.g., CAPP"
                  />
                </div>
                <div>
                  <Label htmlFor="hsnCode" className="text-sm font-medium text-foreground">HSN Code</Label>
                  <Input
                    id="hsnCode"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({...formData, hsnCode: e.target.value})}
                    placeholder="e.g., 9963"
                  />
                </div>
              </div>
            </div>

            {/* Order Type Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Order Type Availability</h3>
              <div className="flex flex-wrap gap-4">
                {orderTypeOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`order-type-${option.id}`}
                      checked={formData.orderTypes.includes(option.id)}
                      onCheckedChange={() => toggleOrderType(option.id)}
                    />
                    <Label
                      htmlFor={`order-type-${option.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pricing</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price" className="text-sm font-medium text-foreground">
                    Price (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="unit" className="text-sm font-medium text-foreground">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="e.g., plate, pcs, kg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank if not applicable</p>
                </div>
              </div>

              {/* Area Wise Pricing */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Area Wise Price</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id="area-home"
                      checked={formData.areaWisePricing.homeWebsite.enabled}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          areaWisePricing: {
                            ...prev.areaWisePricing,
                            homeWebsite: { ...prev.areaWisePricing.homeWebsite, enabled: checked as boolean }
                          }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="area-home" className="text-sm font-medium cursor-pointer">Home Website</Label>
                      {formData.areaWisePricing.homeWebsite.enabled && (
                        <Input
                          type="number"
                          value={formData.areaWisePricing.homeWebsite.price}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            areaWisePricing: {
                              ...prev.areaWisePricing,
                              homeWebsite: { ...prev.areaWisePricing.homeWebsite, price: e.target.value }
                            }
                          }))}
                          placeholder="Price"
                          className="mt-1 h-8"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id="area-parcel"
                      checked={formData.areaWisePricing.parcel.enabled}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          areaWisePricing: {
                            ...prev.areaWisePricing,
                            parcel: { ...prev.areaWisePricing.parcel, enabled: checked as boolean }
                          }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="area-parcel" className="text-sm font-medium cursor-pointer">Parcel</Label>
                      {formData.areaWisePricing.parcel.enabled && (
                        <Input
                          type="number"
                          value={formData.areaWisePricing.parcel.price}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            areaWisePricing: {
                              ...prev.areaWisePricing,
                              parcel: { ...prev.areaWisePricing.parcel, price: e.target.value }
                            }
                          }))}
                          placeholder="Price"
                          className="mt-1 h-8"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Pricing */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Platform Pricing</Label>
                <p className="text-xs text-muted-foreground">Set different prices for aggregator platforms. If not set, the base price will be used.</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg border-orange-200">
                    <Checkbox
                      id="platform-swiggy"
                      checked={formData.areaWisePricing.swiggy.enabled}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          areaWisePricing: {
                            ...prev.areaWisePricing,
                            swiggy: { ...prev.areaWisePricing.swiggy, enabled: checked as boolean }
                          }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="platform-swiggy" className="text-sm font-medium cursor-pointer text-orange-600">Swiggy</Label>
                      {formData.areaWisePricing.swiggy.enabled && (
                        <Input
                          type="number"
                          value={formData.areaWisePricing.swiggy.price}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            areaWisePricing: {
                              ...prev.areaWisePricing,
                              swiggy: { ...prev.areaWisePricing.swiggy, price: e.target.value }
                            }
                          }))}
                          placeholder="₹ Price"
                          className="mt-1 h-8"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg border-red-200">
                    <Checkbox
                      id="platform-zomato"
                      checked={formData.areaWisePricing.zomato.enabled}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          areaWisePricing: {
                            ...prev.areaWisePricing,
                            zomato: { ...prev.areaWisePricing.zomato, enabled: checked as boolean }
                          }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="platform-zomato" className="text-sm font-medium cursor-pointer text-red-600">Zomato</Label>
                      {formData.areaWisePricing.zomato.enabled && (
                        <Input
                          type="number"
                          value={formData.areaWisePricing.zomato.price}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            areaWisePricing: {
                              ...prev.areaWisePricing,
                              zomato: { ...prev.areaWisePricing.zomato, price: e.target.value }
                            }
                          }))}
                          placeholder="₹ Price"
                          className="mt-1 h-8"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg border-yellow-200">
                    <Checkbox
                      id="platform-rapido"
                      checked={formData.areaWisePricing.rapido.enabled}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          areaWisePricing: {
                            ...prev.areaWisePricing,
                            rapido: { ...prev.areaWisePricing.rapido, enabled: checked as boolean }
                          }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="platform-rapido" className="text-sm font-medium cursor-pointer text-yellow-600">Rapido</Label>
                      {formData.areaWisePricing.rapido.enabled && (
                        <Input
                          type="number"
                          value={formData.areaWisePricing.rapido.price}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            areaWisePricing: {
                              ...prev.areaWisePricing,
                              rapido: { ...prev.areaWisePricing.rapido, price: e.target.value }
                            }
                          }))}
                          placeholder="₹ Price"
                          className="mt-1 h-8"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax & Discount Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tax & Discount</h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ignore-tax"
                    checked={formData.ignoreTax}
                    onCheckedChange={(checked) => setFormData({...formData, ignoreTax: checked as boolean})}
                  />
                  <Label htmlFor="ignore-tax" className="text-sm font-normal cursor-pointer">
                    Ignore Tax
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ignore-discount"
                    checked={formData.ignoreDiscount}
                    onCheckedChange={(checked) => setFormData({...formData, ignoreDiscount: checked as boolean})}
                  />
                  <Label htmlFor="ignore-discount" className="text-sm font-normal cursor-pointer">
                    Ignore Discount
                  </Label>
                </div>
              </div>
            </div>

            {/* Category Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Category</h3>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({...formData, categoryId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category *" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Food Type Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Choice</h3>
              <RadioGroup
                value={formData.foodType}
                onValueChange={(value) => setFormData({...formData, foodType: value as "veg" | "non_veg" | "egg"})}
                className="flex flex-wrap gap-4"
              >
                {foodTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={`food-type-${option.id}`} />
                      <Label htmlFor={`food-type-${option.id}`} className="flex items-center gap-1.5 text-sm font-normal cursor-pointer">
                        <Icon className={`w-4 h-4 ${option.color}`} />
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Description Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Description</h3>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the item"
                rows={3}
              />
            </div>

            {/* Availability Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Availability</h3>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="available" className="text-sm font-medium text-foreground cursor-pointer">Available</Label>
                <Switch
                  id="available"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData({...formData, isAvailable: checked})}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSubmit} className="flex-1">
                Add Item
              </Button>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
