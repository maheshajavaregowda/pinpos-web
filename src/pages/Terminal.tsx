import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Monitor, 
  Key, 
  RefreshCw, 
  User, 
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function TerminalPage() {
  const navigate = useNavigate();
  
  // Terminal State Persistence
  const [linkedStoreId, setLinkedStoreId] = useState<string | null>(localStorage.getItem("pinpos_terminal_store_id"));
  const [terminalCode, setTerminalCode] = useState<string | null>(localStorage.getItem("pinpos_terminal_code"));
  
  // Login State
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"crew" | "owner">("crew");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Convex Hooks
  const generateCode = useMutation(api.devices.generateCode);
  const statusCheck = useQuery(api.devices.checkStatus, terminalCode ? { code: terminalCode } : "skip");
  const login = useMutation(api.auth.login);

  // 1. Initial Code Generation
  useEffect(() => {
    async function initTerminal() {
      if (!linkedStoreId && !terminalCode) {
        try {
          const result = await generateCode({ 
            deviceName: "POS Terminal", 
            deviceType: "pos" 
          });
          setTerminalCode(result.code);
          localStorage.setItem("pinpos_terminal_code", result.code);
        } catch (error) {
          toast.error("Failed to initialize terminal");
        }
      }
    }
    initTerminal();
  }, [linkedStoreId, terminalCode, generateCode]);

  // Redirect logged-in crew to operational view
  useEffect(() => {
    const userId = localStorage.getItem("pinpos_user_id");
    const userType = localStorage.getItem("pinpos_user_type");
    if (userId && userType === "crew" && linkedStoreId) {
       navigate("/kitchen");
    }
  }, [linkedStoreId, navigate]);

  const updateInfo = useMutation(api.devices.updateDeviceInfo);

  // 2. Poll for Authorization & Handle Remote Unlinking
  useEffect(() => {
    if (statusCheck?.status === "linked" && statusCheck.storeId) {
      const sId = statusCheck.storeId.toString();
      setLinkedStoreId(sId);
      localStorage.setItem("pinpos_terminal_store_id", sId);
      
      // Update device info (Refresh linkedAt)
      if (statusCheck.id) {
          updateInfo({ id: statusCheck.id as any });
      }

      // Only toast on first link in this session
      if (!localStorage.getItem("pinpos_terminal_toast_shown")) {
        toast.success("Terminal Linked Successfully", {
          description: `This device is now authorized for ${statusCheck.deviceName}`
        });
        localStorage.setItem("pinpos_terminal_toast_shown", "true");
      }
    } else if (statusCheck?.status === "rejected") {
      // Remote unlinking detected
      localStorage.removeItem("pinpos_terminal_store_id");
      localStorage.removeItem("pinpos_terminal_code");
      localStorage.removeItem("pinpos_terminal_toast_shown");
      setLinkedStoreId(null);
      setTerminalCode(null);
      toast.error("Terminal Unlinked", { 
        description: "This device has been removed from the store by a manager." 
      });
      window.location.reload();
    }
  }, [statusCheck]);

  // Handle Login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!linkedStoreId) return;

    setIsLoading(true);
    try {
      const credentials: any = {
        platform: "desktop",
        storeId: linkedStoreId as any,
      };

      if (loginMode === "crew") {
        if (!username || (!pin && !ownerPassword)) throw new Error("Enter username and PIN or Password");
        credentials.username = username;
        if (pin) credentials.pin = pin;
        if (ownerPassword) credentials.password = ownerPassword;
      } else {
        if (!ownerEmail || (!ownerPassword && !pin)) throw new Error("Enter credentials");
        credentials.email = ownerEmail;
        if (ownerPassword) credentials.password = ownerPassword;
        else credentials.pin = pin;
      }

      const result = await login(credentials);
      
      localStorage.setItem("pinpos_user_id", result.userId);
      localStorage.setItem("pinpos_store_id", result.storeId || linkedStoreId); // Active session store
      localStorage.setItem("pinpos_user_type", result.type); // 'owner' or 'crew'
      
      toast.success(`Welcome back, ${result.name}`);
      
      if (result.type === "owner") {
        navigate("/dashboard");
      } else {
        // Crew go to operational view
        navigate("/kitchen"); 
      }
    } catch (error: any) {
      toast.error("Authentication Failed", { description: error.message });
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = () => {
    if (confirm("Are you sure you want to unlink this device? You will need an owner to re-authorize it.")) {
      localStorage.removeItem("pinpos_terminal_store_id");
      localStorage.removeItem("pinpos_terminal_code");
      window.location.reload();
    }
  };

  // --- RENDERING: SYNC STATE ---
  if (!linkedStoreId) {
    return (
      <div className="min-h-screen bg-[#FFF7ED] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
            <div className="bg-[#F97316] p-8 rounded-t-3xl text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="flex flex-col items-center text-center gap-4 relative">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                        <Monitor className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase">Connect POS</h1>
                        <p className="text-orange-100 font-medium">Device Authorization Required</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-10 rounded-b-3xl shadow-xl border border-orange-100 flex flex-col items-center text-center space-y-8">
                <div className="space-y-3">
                    <p className="text-gray-500 font-medium text-sm">Enter this code in your Manager Dashboard under</p>
                    <div className="flex items-center justify-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 mx-auto w-fit">
                        <LayoutDashboard className="w-4 h-4 text-orange-500" />
                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Devices &gt; Link New Device</span>
                    </div>
                </div>

                <div className="w-full py-8 bg-orange-50 rounded-[2rem] border-2 border-dashed border-orange-200 group transition-all duration-500 hover:border-orange-400">
                    <div className="text-6xl font-black text-orange-600 tracking-[0.3em] ml-[0.3em] font-mono">
                        {terminalCode || "......"}
                    </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-400 font-semibold animate-pulse">
                    <RefreshCw className="w-4 h-4" />
                    Waiting for manager authorization...
                </div>

                <Button variant="ghost" onClick={() => navigate("/login")} className="text-gray-400 hover:text-orange-600 font-bold">
                    Switch to Manager Login
                </Button>
            </div>
        </div>
      </div>
    );
  }

  // --- RENDERING: LOGIN STATE ---
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Premium Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-[2.5rem] shadow-3xl overflow-hidden relative z-10 border border-white/20">
          {/* Left Panel: Stats & Branding */}
          <div className="bg-[#1C1917] p-12 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-10 left-10 w-48 h-48 border-2 border-white rounded-full" />
                  <div className="absolute bottom-[-20px] right-[-20px] w-64 h-64 border-2 border-white rounded-full" />
              </div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/50">
                        <span className="font-black text-lg">P</span>
                    </div>
                    <span className="text-2xl font-black tracking-tighter">PINPOS <span className="text-orange-500">TERMINAL</span></span>
                </div>

                <div className="space-y-6">
                    <h2 className="text-4xl font-black leading-tight tracking-tight uppercase">
                        Fastest <br />
                        <span className="text-orange-500">Ordering</span> <br />
                        Experience.
                    </h2>
                    <p className="text-gray-400 font-medium">Authorize with your secure PIN to begin the shift.</p>
                </div>
              </div>

              <div className="space-y-4 pt-12 relative">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-green-500" />
                          <div>
                              <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Status</div>
                              <div className="text-sm font-bold text-green-500 tracking-tight">ENCRYPTED & SYNCED</div>
                          </div>
                      </div>
                  </div>
                  <Button variant="ghost" onClick={handleUnlink} className="w-full justify-start text-xs font-bold text-gray-500 hover:text-red-400 hover:bg-red-950/20 px-4 h-10 rounded-xl">
                      <Settings className="w-4 h-4 mr-2" />
                      UNLINK THIS TERMINAL
                  </Button>
              </div>
          </div>

          {/* Right Panel: Login Form */}
          <div className="p-12 flex flex-col justify-center bg-white">
              <div className="mb-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Authorize</h3>
                    <p className="text-gray-400 text-sm font-medium">Terminal Mode: {statusCheck?.deviceName || "Linked"}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full w-12 h-12 border-gray-100 hover:bg-gray-50"
                    onClick={() => setLoginMode(loginMode === "crew" ? "owner" : "crew")}
                  >
                    {loginMode === "crew" ? <User className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </Button>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                  {loginMode === "crew" ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <Button 
                                    type="button" 
                                    variant={!pin ? "default" : "outline"} 
                                    className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl"
                                    onClick={() => setPin("")}
                                >
                                    Use Password
                                </Button>
                                <Button 
                                    type="button" 
                                    variant={pin ? "default" : "outline"} 
                                    className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl"
                                    onClick={() => setOwnerPassword("")} // Clear password to default to PIN input
                                >
                                    Use PIN
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Personnel Username</Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                    <Input 
                                        placeholder="Enter username" 
                                        className="h-14 pl-12 bg-gray-50 border-gray-100 focus:border-orange-500 focus:ring-orange-100 rounded-2xl font-bold text-lg"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            {!pin ? (
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Security Password</Label>
                                    <div className="relative group">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                        <Input 
                                            type="password"
                                            placeholder="••••••••" 
                                            className="h-14 pl-12 bg-gray-50 border-gray-100 focus:border-orange-500 focus:ring-orange-100 rounded-2xl font-bold text-lg"
                                            value={ownerPassword}
                                            onChange={(e) => setOwnerPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Security PIN</Label>
                                    <div className="relative group">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                        <Input 
                                            type="password"
                                            placeholder="••••" 
                                            maxLength={4}
                                            inputMode="numeric"
                                            className="h-14 pl-12 bg-gray-50 border-gray-100 focus:border-orange-500 focus:ring-orange-100 rounded-2xl font-black text-2xl tracking-[0.5em]"
                                            value={pin}
                                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                  ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Manager Email</Label>
                            <Input 
                                placeholder="Email address" 
                                className="h-12 bg-gray-50 border-gray-100 focus:border-blue-500 focus:ring-blue-100 rounded-xl font-bold"
                                value={ownerEmail}
                                onChange={(e) => setOwnerEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Password or PIN</Label>
                            <Input 
                                type="password"
                                placeholder="Manager credentials" 
                                className="h-12 bg-gray-50 border-gray-100 focus:border-blue-500 focus:ring-blue-100 rounded-xl font-bold"
                                value={ownerPassword || pin}
                                onChange={(e) => {
                                    if (e.target.value.length <= 4 && !isNaN(Number(e.target.value))) {
                                        setPin(e.target.value);
                                        setOwnerPassword("");
                                    } else {
                                        setOwnerPassword(e.target.value);
                                    }
                                }}
                            />
                        </div>
                    </div>
                  )}

                  <Button 
                    className={`w-full h-16 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                        loginMode === "crew" ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-neutral-900 hover:bg-neutral-800 shadow-neutral-200'
                    }`}
                    onClick={() => handleLogin()}
                    disabled={isLoading}
                  >
                      {isLoading ? (
                          <RefreshCw className="w-6 h-6 animate-spin" />
                      ) : (
                          <>
                              {loginMode === "crew" ? "START SHIFT" : "MANAGER ACCESS"}
                              <ChevronRight className="w-6 h-6" />
                          </>
                      )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 pt-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Store: {statusCheck?.storeId ? 'VERIFIED' : 'PENDING'}</span>
                  </div>
              </form>
          </div>
      </div>
    </div>
  );
}
