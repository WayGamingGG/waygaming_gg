import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Target, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Player {
  player_user_id: string;
  nickname: string;
  role: string;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  notes: string | null;
  player_id: string;
  created_at: string;
  player_name?: string;
}

const categories = ["Micro", "Macro", "Laning", "TF", "Rotação", "Comportamental"];

export const MissionsCoach = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newMission, setNewMission] = useState({
    player_id: "",
    title: "",
    description: "",
    category: "",
    deadline: "",
    notes: "",
  });

  useEffect(() => {
    loadPlayers();
    loadMissions();
  }, []);

  const loadPlayers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("players")
        .select("player_user_id, nickname, role")
        .eq("user_id", user.id);

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Erro ao carregar jogadores:", error);
    }
  };

  const loadMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch player names separately
      const missionsWithNames = await Promise.all(
        (data || []).map(async (mission) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", mission.player_id)
            .single();
          
          return {
            ...mission,
            player_name: profileData?.full_name || "Jogador",
          };
        })
      );

      setMissions(missionsWithNames);
    } catch (error) {
      console.error("Erro ao carregar missões:", error);
    }
  };

  const handleCreateMission = async () => {
    if (!newMission.player_id || !newMission.title || !newMission.description || 
        !newMission.category || !newMission.deadline) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("missions").insert({
        coach_id: user.id,
        player_id: newMission.player_id,
        title: newMission.title,
        description: newMission.description,
        category: newMission.category,
        deadline: newMission.deadline,
        notes: newMission.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Missão criada",
        description: "A missão foi atribuída ao jogador com sucesso",
      });

      setIsDialogOpen(false);
      setNewMission({
        player_id: "",
        title: "",
        description: "",
        category: "",
        deadline: "",
        notes: "",
      });
      loadMissions();
    } catch (error) {
      console.error("Erro ao criar missão:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar missão",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Micro: "bg-blue-500/20 text-blue-300",
      Macro: "bg-purple-500/20 text-purple-300",
      Laning: "bg-green-500/20 text-green-300",
      TF: "bg-red-500/20 text-red-300",
      Rotação: "bg-yellow-500/20 text-yellow-300",
      Comportamental: "bg-pink-500/20 text-pink-300",
    };
    return colors[category] || "bg-gray-500/20 text-gray-300";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold">Missões</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Missão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Missão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Jogador *</Label>
                <Select
                  value={newMission.player_id}
                  onValueChange={(value) =>
                    setNewMission({ ...newMission, player_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um jogador" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.player_user_id} value={player.player_user_id}>
                        {player.nickname} - {player.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Título *</Label>
                <Input
                  value={newMission.title}
                  onChange={(e) =>
                    setNewMission({ ...newMission, title: e.target.value })
                  }
                  placeholder="Ex: Farmar 250 minions"
                />
              </div>

              <div>
                <Label>Descrição *</Label>
                <Textarea
                  value={newMission.description}
                  onChange={(e) =>
                    setNewMission({ ...newMission, description: e.target.value })
                  }
                  placeholder="Ex: Farmar 250 minions em 28 minutos"
                  rows={3}
                />
              </div>

              <div>
                <Label>Categoria *</Label>
                <Select
                  value={newMission.category}
                  onValueChange={(value) =>
                    setNewMission({ ...newMission, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prazo *</Label>
                <Input
                  type="datetime-local"
                  value={newMission.deadline}
                  onChange={(e) =>
                    setNewMission({ ...newMission, deadline: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={newMission.notes}
                  onChange={(e) =>
                    setNewMission({ ...newMission, notes: e.target.value })
                  }
                  placeholder="Adicione observações adicionais..."
                  rows={2}
                />
              </div>

              <Button onClick={handleCreateMission} disabled={loading} className="w-full">
                {loading ? "Criando..." : "Criar Missão"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {missions.length === 0 ? (
          <Card className="glass-card p-8 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhuma missão criada ainda. Crie a primeira missão para seus jogadores!
            </p>
          </Card>
        ) : (
          missions.map((mission) => (
            <Card key={mission.id} className="glass-card p-4 sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{mission.title}</h3>
                  <p className="text-muted-foreground mb-3">{mission.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${getCategoryColor(mission.category)}`}>
                      {mission.category}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm bg-muted">
                      {mission.player_name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(mission.deadline).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              {mission.notes && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{mission.notes}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
