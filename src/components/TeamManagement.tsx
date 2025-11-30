import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
  nickname: string;
  role: string;
  user_id: string;
  player_user_id: string;
}

interface RegisteredPlayer {
  id: string;
  email: string;
  full_name: string | null;
}

export const TeamManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ user_id: "", nickname: "", role: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayers();
    fetchRegisteredPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .order("role");

    if (error) {
      toast({
        title: "Erro ao carregar jogadores",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setPlayers(data || []);
  };

  const fetchRegisteredPlayers = async () => {
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "player");

    if (rolesError) {
      toast({
        title: "Erro ao carregar jogadores",
        description: rolesError.message,
        variant: "destructive",
      });
      return;
    }

    if (!rolesData || rolesData.length === 0) {
      setRegisteredPlayers([]);
      return;
    }

    const playerIds = rolesData.map(r => r.user_id);

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", playerIds)
      .eq("approved", true);

    if (profilesError) {
      toast({
        title: "Erro ao carregar perfis",
        description: profilesError.message,
        variant: "destructive",
      });
      return;
    }

    setRegisteredPlayers(profilesData || []);
  };

  const handleAddPlayer = async () => {
    if (!newPlayer.user_id || !newPlayer.nickname || !newPlayer.role) {
      toast({
        title: "Preencha todos os campos",
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

    // Get the player's name from profiles
    const selectedPlayer = registeredPlayers.find(p => p.id === newPlayer.user_id);
    if (!selectedPlayer) {
      toast({
        title: "Jogador não encontrado",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("players").insert({
      user_id: user.id, // Coach's ID
      player_user_id: newPlayer.user_id, // Player's actual user ID
      name: selectedPlayer.full_name || selectedPlayer.email,
      nickname: newPlayer.nickname,
      role: newPlayer.role,
    });

    if (error) {
      toast({
        title: "Erro ao adicionar jogador",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Jogador adicionado à equipe!",
    });

    setNewPlayer({ user_id: "", nickname: "", role: "" });
    setIsAdding(false);
    fetchPlayers();
  };

  const handleDeletePlayer = async (id: string) => {
    const { error } = await supabase.from("players").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erro ao remover jogador",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Jogador removido",
    });

    fetchPlayers();
  };

  return (
    <Card className="glass-card p-3 sm:p-6 border-primary/30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-lg sm:text-xl font-bold">Minha Equipe</h3>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          size="sm"
          className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Jogador
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 rounded-lg bg-muted/20 border border-border/30 space-y-3">
          <Select
            value={newPlayer.user_id}
            onValueChange={(value) => setNewPlayer({ ...newPlayer, user_id: value })}
          >
            <SelectTrigger className="glass-card border-border/50">
              <SelectValue placeholder="Selecione o jogador" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {registeredPlayers.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Nenhum jogador disponível
                </div>
              ) : (
                registeredPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.full_name || player.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Input
            placeholder="Nickname"
            value={newPlayer.nickname}
            onChange={(e) => setNewPlayer({ ...newPlayer, nickname: e.target.value })}
            className="glass-card border-border/50"
          />
          <Select
            value={newPlayer.role}
            onValueChange={(value) => setNewPlayer({ ...newPlayer, role: value })}
          >
            <SelectTrigger className="glass-card border-border/50">
              <SelectValue placeholder="Selecione a rota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Top">Top</SelectItem>
              <SelectItem value="Jungle">Jungle</SelectItem>
              <SelectItem value="Mid">Mid</SelectItem>
              <SelectItem value="ADC">ADC</SelectItem>
              <SelectItem value="Support">Support</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleAddPlayer} className="flex-1">
              Salvar
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

      <div className="space-y-2">
        {players.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum jogador cadastrado ainda
          </p>
        ) : (
          players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
            >
              <div>
                <p className="font-medium">{player.nickname}</p>
                <p className="text-sm text-muted-foreground">
                  {player.name} • {player.role}
                </p>
              </div>
              <Button
                onClick={() => handleDeletePlayer(player.id)}
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
