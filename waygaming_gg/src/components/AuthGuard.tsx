import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "./Auth";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        // Check if user is approved
        const { data: profile } = await supabase
          .from("profiles")
          .select("approved")
          .eq("id", session.user.id)
          .single();

        setApproved(profile?.approved ?? false);

        // Get user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        setUserRole(roleData?.role ?? null);

        // Redirect based on role if approved
        if (profile?.approved && roleData?.role) {
          const currentPath = window.location.pathname;
          if (roleData.role === "admin" && !currentPath.startsWith("/admin")) {
            navigate("/admin/dashboard");
          } else if (roleData.role === "coach" && currentPath !== "/coach") {
            navigate("/coach");
          } else if (roleData.role === "player" && currentPath !== "/player") {
            navigate("/player");
          }
        }
      }

      setLoading(false);
    };

    checkUserStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (approved === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="glass-card p-8 w-full max-w-md border-accent/30">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">
            Aguardando Aprovação
          </h2>
          <p className="text-center text-muted-foreground mb-6">
            Sua conta está aguardando aprovação de um administrador. 
            Você será notificado assim que sua conta for aprovada.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
