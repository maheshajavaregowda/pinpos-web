import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Building2,
  LogOut,
  Monitor,
  ChefHat,
  Users,
  Link2,
  CreditCard
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const userType = localStorage.getItem("pinpos_user_type");

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['owner'] },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/orders', roles: ['owner', 'crew'] }, // Assuming orders is later operational
    { id: 'menu', label: 'Menu Items', icon: Package, path: '/menu', roles: ['owner'] },
    { id: 'kitchen', label: 'Kitchen Display', icon: ChefHat, path: '/kitchen', roles: ['owner', 'crew'] },
    { id: 'crew', label: 'Crew HQ', icon: Users, path: '/crew', roles: ['owner'] },
    { id: 'devices', label: 'Linked Devices', icon: Monitor, path: '/devices', roles: ['owner'] },
    { id: 'integrations', label: 'Integrations', icon: Link2, path: '/integrations', roles: ['owner'] },
    { id: 'billing', label: 'Billing', icon: CreditCard, path: '/billing', roles: ['owner'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports', roles: ['owner'] },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', roles: ['owner'] },
  ];

  const filteredItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(userType || 'owner')
  );

  const handleSignOut = () => {
    // Determine if we should go back to Terminal Login or regular Login
    const terminalStoreId = localStorage.getItem("pinpos_terminal_store_id");
    
    // Clear user-specific session data
    localStorage.removeItem("pinpos_user_id");
    localStorage.removeItem("pinpos_store_id");
    localStorage.removeItem("pinpos_user_type");

    if (terminalStoreId) {
        // If it's a linked terminal, go back to the Terminal PIN screen
        navigate("/terminal");
    } else {
        // Otherwise, regular login
        navigate("/login");
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-card border-r border-border w-64", className)}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">PinPos</h1>
            <p className="text-sm text-muted-foreground">{userType === 'crew' ? 'Personnel' : 'Admin Portal'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                isActive && "bg-primary text-primary-foreground shadow-sm"
              )}
              onClick={() => navigate(item.path)}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-11 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/settings")}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
