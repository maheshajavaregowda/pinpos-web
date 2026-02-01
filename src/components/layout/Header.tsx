import { Bell, Search, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StoreSwitcher } from './StoreSwitcher';
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
  onMenuClick?: () => void;
}

export const Header = ({ className, onMenuClick }: HeaderProps) => {
  const userEmail = "admin@pinpos.app"; // Mock user email for now

  return (
    <header className={cn("h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-40", className)}>
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <StoreSwitcher />
      </div>

      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search orders, customers..."
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-card" />
        </Button>
        
        <div className="flex items-center gap-3 pl-3 border-l border-border pointer-events-none">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium leading-none">Demo Owner</div>
            <div className="text-xs text-muted-foreground mt-1">{userEmail}</div>
          </div>
          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
            <User className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
};
