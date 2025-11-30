import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPendingApproval, setShowPendingApproval] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta, WG",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        setShowPendingApproval(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showPendingApproval) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4">
        <Card className="glass-card p-8 w-full max-w-md border-accent/30 glow-gold">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Conta Criada com Sucesso!
          </h2>
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Sua conta foi criada, mas precisa ser aprovada por um administrador antes de você poder acessar o sistema.
            </p>
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <p className="text-sm font-medium text-accent mb-2">
                Aguarde a aprovação
              </p>
              <p className="text-xs text-muted-foreground">
                Você receberá acesso assim que um administrador aprovar sua conta. 
                Após a aprovação, você será redirecionado automaticamente para sua área correspondente.
              </p>
            </div>
            <Button
              onClick={() => {
                setShowPendingApproval(false);
                setIsLogin(true);
              }}
              variant="outline"
              className="w-full"
            >
              Voltar ao Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4">
      <Card className="glass-card p-8 w-full max-w-md border-primary/30 glow-blue">
        <div className="flex items-center justify-center">
          <img src="./logowg.png" className="w-42 h-40" />
        </div>
        <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Way Gaming
        </h2>
        <p className="text-center text-muted-foreground mb-6">
          {isLogin ? "Entre na sua conta" : "Crie sua conta"}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="glass-card border-border/50"
            />
          </div>

          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="glass-card border-border/50"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading
              ? "Carregando..."
              : isLogin
              ? "Entrar"
              : "Criar Conta"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin
              ? "Não tem conta? Criar conta"
              : "Já tem conta? Fazer login"}
          </button>
        </div>
      </Card>
    </div>
  );
};
