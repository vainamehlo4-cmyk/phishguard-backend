import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Inbox, 
  BookOpen, 
  Users, 
  Send,
  LogOut,
  ShieldCheck,
  CalendarClock
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const isAdmin = user.role === "admin";

  const userLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbox", label: "Simulated Inbox", icon: Inbox },
    { href: "/training", label: "Training", icon: BookOpen },
  ];

  const adminLinks = [
    { href: "/admin", label: "Command Center", icon: ShieldAlert },
    { href: "/admin/users", label: "User Risk", icon: Users },
    { href: "/admin/simulations", label: "Simulations", icon: Send },
    { href: "/admin/campaigns", label: "Campaigns", icon: CalendarClock },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col fixed inset-y-0 z-10">
        <div className="h-16 flex items-center px-6 border-b border-border text-primary">
          <ShieldCheck className="w-6 h-6 mr-3" />
          <span className="font-mono font-bold tracking-tight text-lg">PHISHGUARD</span>
        </div>
        
        <div className="p-4 flex-1">
          <div className="text-xs font-mono text-muted-foreground mb-4 px-2 uppercase tracking-wider">
            {isAdmin ? "Admin Controls" : "User Access"}
          </div>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <Icon className="w-4 h-4 mr-3" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border bg-background/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate" data-testid="text-username">{user.username}</div>
              <div className="text-xs text-muted-foreground truncate">{user.department || "No Department"}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive shrink-0" data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <ChangePasswordDialog />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pl-64 bg-background">
        <main className="p-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
