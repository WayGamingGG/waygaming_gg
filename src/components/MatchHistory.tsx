import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Match {
  id: string;
  match_date: string;
  opponent_team: string;
  result: string;
  notes: string | null;
}

export const MatchHistory = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newMatch, setNewMatch] = useState({
    opponent_team: "",
    result: "win",
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar partidas",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setMatches(data || []);
  };

  const handleAddMatch = async () => {
    if (!newMatch.opponent_team) {
      toast({
        title: "Preencha o nome do time adversário",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Você precisa estar logado",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("matches").insert({
      ...newMatch,
      user_id: user.id,
    });

    if (error) {
      toast({
        title: "Erro ao adicionar partida",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Partida registrada!",
    });

    setNewMatch({ opponent_team: "", result: "win", notes: "" });
    setIsAdding(false);
    fetchMatches();
  };

  const getWinRate = () => {
    if (matches.length === 0) return 0;
    const wins = matches.filter((m) => m.result === "win").length;
    return ((wins / matches.length) * 100).toFixed(1);
  };

  return (
    <Card className="glass-card p-6 border-accent/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">Histórico de Partidas</h3>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">
                Win Rate: <span className="font-bold text-accent">{getWinRate()}%</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-primary">{matches.length}</span>
              </span>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30"
        >
          Nova Partida
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 rounded-lg bg-muted/20 border border-border/30 space-y-3">
          <Input
            placeholder="Time adversário"
            value={newMatch.opponent_team}
            onChange={(e) =>
              setNewMatch({ ...newMatch, opponent_team: e.target.value })
            }
            className="glass-card border-border/50"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setNewMatch({ ...newMatch, result: "win" })}
              variant={newMatch.result === "win" ? "default" : "outline"}
              className="flex-1"
            >
              Vitória
            </Button>
            <Button
              onClick={() => setNewMatch({ ...newMatch, result: "loss" })}
              variant={newMatch.result === "loss" ? "default" : "outline"}
              className="flex-1"
            >
              Derrota
            </Button>
          </div>
          <Textarea
            placeholder="Notas sobre a partida (opcional)"
            value={newMatch.notes}
            onChange={(e) => setNewMatch({ ...newMatch, notes: e.target.value })}
            className="glass-card border-border/50 min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button onClick={handleAddMatch} className="flex-1">
              Salvar Partida
            </Button>
            <Button
              onClick={() => setIsAdding(false)}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {matches.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma partida registrada ainda
          </p>
        ) : (
          matches.map((match) => (
            <div
              key={match.id}
              className="p-3 rounded-lg bg-muted/20 border border-border/30"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      match.result === "win"
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-secondary/20 text-secondary border-secondary/30"
                    }
                  >
                    {match.result === "win" ? "VITÓRIA" : "DERROTA"}
                  </Badge>
                  <span className="font-medium">vs {match.opponent_team}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(match.match_date).toLocaleDateString()}
                </span>
              </div>
              {match.notes && (
                <p className="text-sm text-muted-foreground mt-2">{match.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
