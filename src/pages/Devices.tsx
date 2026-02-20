import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Monitor, 
  Smartphone, 
  Clock, 
  CheckCircle2, 
  MoreVertical,
  Plus,
  Trash2,
  ExternalLink,
  Store,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function DevicesPage() {
  const storeId = localStorage.getItem("pinpos_store_id");
  const userId = localStorage.getItem("pinpos_user_id");
  
  const devices = useQuery(api.devices.getLinkedDevices, storeId ? { storeId: storeId as any } : "skip") || [];
  const stores = useQuery(api.stores.getAccessibleStores, { userId: userId as any }) || [];
  
  // Auto-select first store if none active
  useEffect(() => {
    if (!storeId && stores.length > 0) {
      localStorage.setItem("pinpos_store_id", stores[0]._id);
      window.location.reload();
    }
  }, [stores, storeId]);

  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [mappingCode, setMappingCode] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>(storeId || "");
  const [isVerifying, setIsVerifying] = useState(false);
  
  const verifyDevice = useMutation(api.devices.verifyCode);
  const unlinkDevice = useMutation(api.devices.removeDevice);

  const handleUnlinkDevice = async (id: string) => {
    try {
      await unlinkDevice({ id: id as any });
      toast.success("Device Unlinked", {
          description: "Terminal has been disconnected and unlinked."
      });
    } catch (error: any) {
      toast.error("Unlink Failed", {
          description: error.message || "Could not unlink device."
      });
    }
  };

  const handleVerifyDevice = async () => {
    if (!mappingCode || !selectedStoreId) {
        toast.error("Required Fields Missing", {
            description: "Please select an outlet and enter the mapping code."
        });
        return;
    }
    
    setIsVerifying(true);
    try {
      await verifyDevice({ 
          code: mappingCode.toUpperCase(), 
          storeId: selectedStoreId as any 
      });
      toast.success("Device Linked Successfully", {
          description: "Terminal has been authorized and linked to the selected outlet."
      });
      setIsVerifyOpen(false);
      setMappingCode("");
    } catch (error: any) {
      toast.error("Linking Failed", {
        description: error.message || "The code or outlet selection is invalid."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "linked":
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Disconnected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case "pos":
        return <Monitor className="w-5 h-5" />;
      case "kds":
      case "waiter":
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Linked Devices</h1>
          <p className="text-muted-foreground mt-1">
            Authorize and manage terminals, KDS, and mobile devices across your outlets.
          </p>
        </div>
        
        <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white h-11 px-6 shadow-md transition-all active:scale-95">
              <Plus className="w-4 h-4" />
              Link New Device
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden rounded-xl">
            {/* Header Matching Desktop Style */}
            <div className="bg-[#F97316] text-white p-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold text-white">Link Device</DialogTitle>
                        <p className="text-orange-100 text-sm opacity-90">Secure Device Authorization</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6 bg-white">
              <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-gray-700 font-medium flex items-center gap-2">
                        <Store className="w-4 h-4 text-orange-500" />
                        Select Outlet / Cafe
                    </Label>
                    <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                        <SelectTrigger className="h-12 border-gray-200 bg-orange-50/30 focus:ring-orange-200 focus:border-orange-500">
                            <SelectValue placeholder="Choose an outlet" />
                        </SelectTrigger>
                        <SelectContent>
                            {stores.map((store) => (
                                <SelectItem key={store._id} value={store._id}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{store.name}</span>
                                        <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded uppercase">{store.storeCode}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground italic">Device will be tied to the selected outlet's inventory and reports.</p>
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-700 font-medium flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-orange-500" />
                        Mapping Code
                    </Label>
                    <Input
                        placeholder="ENTER 6-DIGIT CODE"
                        className="h-14 text-center font-mono text-2xl uppercase tracking-[0.2em] border-gray-200 bg-orange-50/30 focus:ring-orange-200 focus:border-orange-500 placeholder:text-gray-300"
                        value={mappingCode}
                        onChange={(e) => setMappingCode(e.target.value.toUpperCase())}
                        maxLength={6}
                    />
                    <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-blue-50/50 p-2 rounded border border-blue-100">
                        <AlertCircle className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                        <span>The code is visible on the POS or KDS login screen under "Sync Device".</span>
                    </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex flex-col gap-3">
              <Button
                type="button"
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-sm"
                onClick={handleVerifyDevice}
                disabled={isVerifying || mappingCode.length < 6 || !selectedStoreId}
              >
                {isVerifying ? "VERIFYING..." : "AUTHORIZE & LINK"}
              </Button>
              <Button variant="ghost" onClick={() => setIsVerifyOpen(false)} className="text-gray-500">
                  Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {devices.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3 h-64 flex flex-col items-center justify-center text-center p-8 bg-[#FFF7ED]/30 border-2 border-dashed border-orange-200 rounded-2xl">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Monitor className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
            <h3 className="font-bold text-xl text-gray-800">No Linked Devices</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Linking a device allows it to sync orders, menu data, and reports with your cloud dashboard in real-time.
            </p>
            <Button 
                variant="link" 
                className="mt-4 text-orange-600 font-semibold flex items-center gap-1"
                onClick={() => setIsVerifyOpen(true)}
            >
                Start Linking Process <ChevronRight className="w-4 h-4" />
            </Button>
          </Card>
        ) : (
          devices.map((device: any) => (
            <Card key={device._id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white rounded-xl ring-1 ring-gray-100 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-sm">
                    {getDeviceIcon(device.deviceType)}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900 leading-tight">{device.deviceName || "Unnamed Terminal"}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-1">
                        <CardDescription className="capitalize text-xs font-medium">{device.deviceType || "General"} Station</CardDescription>
                        <span className="text-gray-300">•</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{device.code}</span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 border rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl">
                    <DropdownMenuItem className="gap-2 px-3 py-2 cursor-pointer">
                      <ExternalLink className="w-4 h-4 text-blue-500" />
                      View Statistics
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2 px-3 py-2 text-destructive cursor-pointer"
                      onClick={() => handleUnlinkDevice(device._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Unlink Device
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-tight flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Connection
                    </span>
                    {getStatusBadge(device.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 px-1">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Since</span>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                             <Clock className="w-3 h-3 text-orange-400" />
                             {device.linkedAt ? formatDistanceToNow(device.linkedAt, { addSuffix: true }) : "N/A"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Outlet Sync</span>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                             <Store className="w-3 h-3 text-green-400" />
                             Online
                        </div>
                      </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
