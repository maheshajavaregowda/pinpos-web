import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, Database } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const login = useMutation(api.auth.login);
  const seed = useMutation(api.seed.seed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login({ email, password, platform: "web" });
      
      if (result.type !== "owner") {
          throw new Error("This portal is restricted to Store Owners only. Crew members must use the Desktop Terminal.");
      }

      // Save to localStorage
      if (result.storeId) {
        localStorage.setItem("pinpos_store_id", result.storeId);
      }
      if (result.userId) {
          localStorage.setItem("pinpos_user_id", result.userId);
          localStorage.setItem("pinpos_user_type", result.type);
      }
      
      toast.success(`Welcome, ${result.name}`);
      navigate("/dashboard");
    } catch (err: any) {
        toast.error("Access Denied", {
            description: err.message
        });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    setIsLoading(true);
    try {
        await seed();
        toast.success("Demo data created!", {
            description: "Login with: demo@pinpos.app / password123"
        });
        setEmail("demo@pinpos.app");
        setPassword("password123");
    } catch (err: any) {
        toast.error("Failed to seed data", {
            description: err.message
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED] p-4">
      <div className="w-full max-w-6xl">
        {/* Header Bar - Matching Desktop Design */}
        <div className="bg-[#F97316] text-white p-4 rounded-t-lg flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
              <span className="text-sm font-bold text-white">POS</span>
            </div>
            <div>
              <div className="font-bold text-white text-lg">PETPOOJA</div>
              <div className="text-sm text-white/90">POSS</div>
            </div>
          </div>
          <div className="text-right text-white">
            <div className="font-semibold text-lg">Web Dashboard</div>
            <div className="text-sm opacity-90">Manager Access</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white p-12 rounded-b-lg shadow-lg border border-t-0 border-orange-100">
          <Card className="max-w-md mx-auto border-none shadow-none">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold text-gray-800">Login to Dashboard</CardTitle>
              <CardDescription className="text-base text-gray-500 mt-2">Enter your username and password</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">User Name</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter username"
                    inputMode="email"
                    autoComplete="email"
                    required
                    className="h-12 bg-orange-50/30 border-gray-200 focus:border-orange-500 focus:ring-orange-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      required
                      className="h-12 bg-orange-50/30 border-gray-200 focus:border-orange-500 focus:ring-orange-200"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-semibold bg-[#F97316] hover:bg-[#EA580C] text-white shadow-md transition-all active:scale-[0.99] mt-4" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Log In'
                  )}
                </Button>
              </form>
            </CardContent>

            {/* Seed/Reset Button for Demo */}
            <CardFooter className="flex flex-col border-t bg-muted/50 p-6">
                <p className="mb-3 text-sm text-muted-foreground text-center">
                    Having trouble? Reset demo data to default.
                </p>
                <Button variant="outline" className="w-full gap-2" onClick={handleSeed} disabled={isLoading}>
                    <Database className="h-4 w-4" />
                    Reset / Seed Demo Data
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
