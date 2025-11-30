import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, ClipboardList, Mail, LogOut, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const adminNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/users", label: "Usuários", icon: Users },
  // { path: "/admin/contracts", label: "Contratos", icon: FileText },
  { path: "/admin/evaluations", label: "Avaliações", icon: ClipboardList },
  { path: "/admin/messages", label: "Mensagens", icon: Mail },
  { path: "/admin/waypoints", label: "Way Points", icon: Trophy },
];

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu do sistema com sucesso."
    });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-card border-r border-border">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              WG_Staff
            </h2>
            <p className="text-sm text-muted-foreground">Way Gaming</p>
          </div>
          <UserProfileDropdown />
        </div>
        <nav className="px-3 space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 bg-background overflow-auto">
        {children}
      </main>
    </div>
  );
};
