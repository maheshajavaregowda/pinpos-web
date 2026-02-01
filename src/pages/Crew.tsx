import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  Key,
  ChefHat,
  Smartphone,
  CreditCard,
  RefreshCw,
  Search,
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CrewPage() {
  const storeIdFromStorage = localStorage.getItem("pinpos_store_id");
  const userId = localStorage.getItem("pinpos_user_id");

  const [activeStoreId, setActiveStoreId] = useState<string>(storeIdFromStorage || "");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Queries
  const stores = useQuery(api.stores.getAccessibleStores, { userId: userId as any }) || [];
  const crewMembers = useQuery(api.crew.getByStore, activeStoreId ? { storeId: activeStoreId as any } : "skip") || [];

  // Auto-select first store if none active
  useEffect(() => {
    if (!activeStoreId && stores.length > 0) {
      setActiveStoreId(stores[0]._id);
    }
  }, [stores, activeStoreId]);

  // Mutations
  const createCrew = useMutation(api.crew.create);
  const updateCrew = useMutation(api.crew.update);
  const removeCrew = useMutation(api.crew.remove);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    role: "waiter" as "billing" | "waiter" | "chef",
    pin: "",
    password: "",
    confirmPassword: "",
  });

  const handleCreateCrew = async () => {
    if (!activeStoreId) {
        toast.error("Store Selection Missing", { description: "Please select a store to add crew to." });
        return;
    }
    if (!formData.name) {
        toast.error("Name Missing", { description: "Please enter the personnel's full name." });
        return;
    }
    if (!formData.username) {
        toast.error("Username Missing", { description: "Please enter a unique desktop username." });
        return;
    }
    if (!formData.pin) {
        toast.error("PIN Missing", { description: "Please provide a 4-digit security PIN." });
        return;
    }
    if (!formData.password) {
        toast.error("Password Missing", { description: "Please set a password for the account." });
        return;
    }

    if (formData.password !== formData.confirmPassword) {
        toast.error("Password Mismatch", { description: "Passwords do not match." });
        return;
    }
    
    setIsVerifying(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      await createCrew({ 
          ...submitData, 
          storeId: activeStoreId as any 
      });
      toast.success("Crew Onboarded", {
          description: `${formData.name} can now log in on the Desktop app.`
      });
      setIsCreateOpen(false);
      setFormData({ name: "", username: "", role: "waiter", pin: "", password: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error("Process Failed", { description: error.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
      try {
          await updateCrew({ id: id as any, isActive: !current });
          toast.success("Status Updated");
      } catch (error: any) {
          toast.error("Update Failed");
      }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case "billing":
        return { 
          icon: <CreditCard className="w-4 h-4" />, 
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          accent: "bg-blue-500"
        };
      case "chef":
        return { 
          icon: <ChefHat className="w-4 h-4" />, 
          bg: "bg-orange-50 text-orange-700 border-orange-200",
          accent: "bg-orange-500"
        };
      case "waiter":
        return { 
          icon: <Smartphone className="w-4 h-4" />, 
          bg: "bg-green-50 text-green-700 border-green-200",
          accent: "bg-green-500"
        };
      default:
        return { icon: <Users className="w-4 h-4" />, bg: "bg-gray-50", accent: "bg-gray-500" };
    }
  };

  const filteredCrew = crewMembers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
                <Users className="w-7 h-7 text-white" />
             </div>
             <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900">CREW HQ</h1>
                <p className="text-muted-foreground text-sm font-medium">Dashboard-only Management for Desktop POS Access</p>
             </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
                <Label className="text-[10px] uppercase font-bold text-gray-400 px-1">Managing Outlet</Label>
                <Select value={activeStoreId} onValueChange={setActiveStoreId}>
                    <SelectTrigger className="w-[200px] h-11 border-gray-200 bg-gray-50 font-semibold">
                        <SelectValue placeholder="Select Store" />
                    </SelectTrigger>
                    <SelectContent>
                        {stores.map(s => (
                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-black hover:bg-gray-800 text-white h-11 px-6 shadow-md transition-all active:scale-95 mt-5">
                <UserPlus className="w-4 h-4" />
                Add Crew
            </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <Input 
            placeholder="Search by name or username..." 
            className="pl-12 h-14 bg-white border-gray-100 shadow-sm focus:ring-orange-100 focus:border-orange-500 rounded-2xl text-lg font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      {/* Crew Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCrew.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4 h-72 flex flex-col items-center justify-center text-center p-8 bg-[#FFF7ED]/30 border-2 border-dashed border-orange-200 rounded-3xl">
             <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
                <Shield className="w-10 h-10 text-orange-200" />
             </div>
             <h3 className="font-bold text-xl text-gray-800">No Personnel in {stores.find(s => s._id === activeStoreId)?.name || 'this Store'}</h3>
             <p className="text-sm text-gray-500 mt-2 max-w-sm">
                Add your billing staff, waiters, or chefs here to allow them to log in to the Desktop Terminal.
             </p>
          </Card>
        ) : (
          filteredCrew.map((member: any) => {
            const style = getRoleStyle(member.role);
            return (
              <Card key={member._id} className="overflow-hidden border-none shadow-sm hover:shadow-xl transition-all bg-white rounded-2xl ring-1 ring-gray-100 group">
                <div className={`h-1.5 w-full ${style.accent}`} />
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${style.bg}`}>
                            {style.icon}
                        </div>
                        <div>
                            <CardTitle className="text-base font-black text-gray-900">{member.name}</CardTitle>
                            <Badge variant="outline" className={`mt-1 capitalize text-[10px] font-bold py-0 h-4 border-none shadow-sm ${style.bg}`}>
                                {member.role}
                            </Badge>
                        </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-gray-100">
                            <MoreVertical className="w-4 h-4" />
                         </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl border-gray-100">
                          <DropdownMenuItem onClick={() => toggleStatus(member._id, member.isActive)} className="gap-3 h-10 rounded-xl">
                             {member.isActive ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                             <span className="font-semibold">{member.isActive ? "Deactivate" : "Activate"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem onClick={() => {if(confirm('Remove this member?')) removeCrew({id: member._id})}} className="gap-3 h-10 rounded-xl text-destructive hover:bg-destructive/5 font-semibold">
                             <Trash2 className="w-4 h-4" /> Remove
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                             <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">UNAME</span>
                             <div className="text-sm font-mono font-bold text-gray-800 truncate">{member.username}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100">
                             <span className="text-[10px] text-orange-400 font-black uppercase tracking-widest block mb-1">PIN</span>
                             <div className="text-sm font-mono font-black text-orange-700 flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5" /> {member.pin}
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-1 pt-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${member.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{member.isActive ? 'Desktop Ready' : 'Access Revoked'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                            <Clock className="w-3.5 h-3.5" />
                            {member.lastLogin ? format(member.lastLogin, "MMM d, HH:mm") : "NEVER LOGGED"}
                        </div>
                    </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Onboarding Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-[2rem] shadow-3xl">
              <div className="bg-[#1C1917] p-8 text-white relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/20 rounded-full blur-2xl -mr-10 -mt-10" />
                  <div className="flex items-center gap-4 relative">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                            <UserPlus className="w-8 h-8 text-orange-500" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-white tracking-tight uppercase">Crew Onboarding</DialogTitle>
                            <DialogDescription className="text-gray-400 font-medium text-sm">Valid for Desktop Terminal access only.</DialogDescription>
                        </div>
                  </div>
              </div>

              <div className="p-8 space-y-6 bg-white">
                  <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-2">
                              <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Designation</Label>
                              <Select value={formData.role} onValueChange={(v: any) => setFormData(p => ({ ...p, role: v }))}>
                                  <SelectTrigger className="h-12 border-gray-200 bg-gray-50 font-bold rounded-xl">
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="billing">Counter / Billing</SelectItem>
                                      <SelectItem value="waiter">Service / Waiter</SelectItem>
                                      <SelectItem value="chef">Kitchen / Chef</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Security PIN</Label>
                              <div className="flex gap-2">
                                  <Input 
                                    className="h-12 font-mono font-black text-center tracking-[0.3em] bg-orange-50 border-orange-100 text-orange-700 text-lg rounded-xl"
                                    maxLength={4}
                                    value={formData.pin}
                                    placeholder="0000"
                                    onChange={(e) => setFormData(p => ({ ...p, pin: e.target.value.replace(/\D/g, '') }))}
                                  />
                                  <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-xl" onClick={() => setFormData(p => ({...p, pin: Math.floor(1000 + Math.random() * 9000).toString() }))}>
                                       <RefreshCw className="w-5 h-5" />
                                  </Button>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-2">
                          <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Full Personnel Name</Label>
                          <Input 
                            placeholder="e.g. Rahul Sharma" 
                            className="h-12 border-gray-200 focus:ring-orange-100 font-bold rounded-xl"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                          />
                      </div>

                      <div className="space-y-2">
                          <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Desktop Username</Label>
                          <div className="relative">
                              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input 
                                placeholder="Unique username for terminal login" 
                                className="h-12 pl-12 border-gray-200 focus:ring-orange-100 font-mono font-bold rounded-xl"
                                value={formData.username}
                                onChange={(e) => setFormData(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-2">
                              <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Password</Label>
                              <Input 
                                type="password"
                                placeholder="••••••••" 
                                className="h-12 border-gray-200 focus:ring-orange-100 font-bold rounded-xl"
                                value={formData.password}
                                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                              />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Confirm Password</Label>
                              <Input 
                                type="password"
                                placeholder="••••••••" 
                                className="h-12 border-gray-200 focus:ring-orange-100 font-bold rounded-xl"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                              />
                          </div>
                      </div>
                  </div>
              </div>

              <div className="p-8 bg-gray-50 border-t flex flex-col gap-3">
                  <Button 
                    className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-black text-lg shadow-xl shadow-orange-100 tracking-tight rounded-2xl active:scale-95 transition-all"
                    onClick={handleCreateCrew}
                    disabled={isVerifying}
                  >
                      {isVerifying ? "CREATING ACCOUNT..." : "CREATE CREW ACCOUNT"}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="font-bold text-gray-500">
                      Discard Request
                  </Button>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
