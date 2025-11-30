import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Target, Clock, CheckCircle2, XCircle, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  notes: string | null;
  created_at: string;
}

interface MissionResponse {
  id: string;
  mission_id: string;
  status: "pending" | "accepted" | "completed" | "failed";
  completed_at: string | null;
  player_notes: string | null;
  match_data: any;
}

export const MissionsPlayer = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [responses, setResponses] = useState<Record<string, MissionResponse>>({});
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [responseData, setResponseData] = useState({
    player_notes: "",
    completed_at: "",
    summoner_name: "",
    tag_line: "",
  });

  useEffect(() => {
    loadMissions();
    loadResponses();

    // Realtime subscription for new missions
    const channel = supabase
      .channel("missions-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "missions",
        },
        (payload) => {
          toast({
            title: "Nova Missão!",
            description: "Você recebeu uma nova missão do seu coach",
          });
          loadMissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("player_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error("Erro ao carregar missões:", error);
    }
  };

  const loadResponses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("mission_responses")
        .select("*")
        .eq("player_id", user.id);

      if (error) throw error;

      const responsesMap: Record<string, MissionResponse> = {};
      data?.forEach((response) => {
        responsesMap[response.mission_id] = {
          id: response.id,
          mission_id: response.mission_id,
          status: response.status as "pending" | "accepted" | "completed" | "failed",
          completed_at: response.completed_at,
          player_notes: response.player_notes,
          match_data: response.match_data,
        };
      });
      setResponses(responsesMap);
    } catch (error) {
      console.error("Erro ao carregar respostas:", error);
    }
  };

  const handleAcceptMission = async (missionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("mission_responses").insert({
        mission_id: missionId,
        player_id: user.id,
        status: "accepted",
      });

      if (error) throw error;

      toast({
        title: "Missão aceita",
        description: "Você aceitou a missão. Boa sorte!",
      });
      loadResponses();
    } catch (error) {
      console.error("Erro ao aceitar missão:", error);
      toast({
        title: "Erro",
        description: "Erro ao aceitar missão",
        variant: "destructive",
      });
    }
  };

  const handleCompleteMission = async (success: boolean) => {
    if (!selectedMission) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let matchData = null;
      
      // Fetch match data from Riot API if summoner name provided
      if (success && responseData.summoner_name && responseData.tag_line) {
        try {
          const { data: matchesData } = await supabase.functions.invoke("riot-matches", {
            body: {
              gameName: responseData.summoner_name,
              tagLine: responseData.tag_line,
              count: 5,
            },
          });
          matchData = matchesData;
        } catch (error) {
          console.error("Erro ao buscar dados da partida:", error);
        }
      }

      const response = responses[selectedMission.id];
      
      if (response) {
        const { error } = await supabase
          .from("mission_responses")
          .update({
            status: success ? "completed" : "failed",
            completed_at: responseData.completed_at || new Date().toISOString(),
            player_notes: responseData.player_notes,
            match_data: matchData,
          })
          .eq("id", response.id);

        if (error) throw error;
      }

      toast({
        title: success ? "Missão concluída!" : "Missão não concluída",
        description: success
          ? "Parabéns! Você completou a missão com sucesso"
          : "Missão marcada como não concluída",
      });

      setIsDialogOpen(false);
      setSelectedMission(null);
      setResponseData({
        player_notes: "",
        completed_at: "",
        summoner_name: "",
        tag_line: "",
      });
      loadResponses();
    } catch (error) {
      console.error("Erro ao completar missão:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar missão",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Micro: "bg-blue-500/20 text-blue-300 border-blue-500/50",
      Macro: "bg-purple-500/20 text-purple-300 border-purple-500/50",
      Laning: "bg-green-500/20 text-green-300 border-green-500/50",
      TF: "bg-red-500/20 text-red-300 border-red-500/50",
      Rotação: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
      Comportamental: "bg-pink-500/20 text-pink-300 border-pink-500/50",
    };
    return colors[category] || "bg-gray-500/20 text-gray-300 border-gray-500/50";
  };

  const getStatusBadge = (missionId: string) => {
    const response = responses[missionId];
    if (!response) {
      return <Badge variant="outline">Pendente</Badge>;
    }

    const statusConfig = {
      pending: { label: "Pendente", variant: "outline" as const },
      accepted: { label: "Aceita", variant: "secondary" as const },
      completed: { label: "Concluída", variant: "default" as const },
      failed: { label: "Não Concluída", variant: "destructive" as const },
    };

    const config = statusConfig[response.status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        <h2 className="text-xl sm:text-2xl font-bold">Minhas Missões</h2>
      </div>

      <div className="grid gap-4">
        {missions.length === 0 ? (
          <Card className="glass-card p-8 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Você não tem missões no momento.
            </p>
          </Card>
        ) : (
          missions.map((mission) => {
            const response = responses[mission.id];
            const isExpired = new Date(mission.deadline) < new Date();

            return (
              <Card key={mission.id} className="glass-card p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{mission.title}</h3>
                      {getStatusBadge(mission.id)}
                    </div>
                    <p className="text-muted-foreground mb-3">{mission.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm border ${getCategoryColor(mission.category)}`}>
                        {mission.category}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm bg-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(mission.deadline).toLocaleDateString("pt-BR")}
                      </span>
                      {isExpired && (
                        <span className="px-3 py-1 rounded-full text-sm bg-red-500/20 text-red-300">
                          Expirada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {mission.notes && (
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{mission.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {!response && (
                    <Button
                      onClick={() => handleAcceptMission(mission.id)}
                      variant="outline"
                    >
                      Aceitar Missão
                    </Button>
                  )}
                  {response && response.status === "accepted" && (
                    <Dialog
                      open={isDialogOpen && selectedMission?.id === mission.id}
                      onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (open) setSelectedMission(mission);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button>Concluir Missão</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Concluir Missão: {mission.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Data de Conclusão</Label>
                            <Input
                              type="datetime-local"
                              value={responseData.completed_at}
                              onChange={(e) =>
                                setResponseData({ ...responseData, completed_at: e.target.value })
                              }
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Nome do Invocador (Riot ID)</Label>
                              <Input
                                value={responseData.summoner_name}
                                onChange={(e) =>
                                  setResponseData({ ...responseData, summoner_name: e.target.value })
                                }
                                placeholder="Ex: Player"
                              />
                            </div>
                            <div>
                              <Label>Tag Line</Label>
                              <Input
                                value={responseData.tag_line}
                                onChange={(e) =>
                                  setResponseData({ ...responseData, tag_line: e.target.value })
                                }
                                placeholder="Ex: BR1"
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Observações</Label>
                            <Textarea
                              value={responseData.player_notes}
                              onChange={(e) =>
                                setResponseData({ ...responseData, player_notes: e.target.value })
                              }
                              placeholder="Adicione suas observações sobre a missão..."
                              rows={4}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleCompleteMission(true)}
                              disabled={loading}
                              className="flex-1"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Missão Concluída
                            </Button>
                            <Button
                              onClick={() => handleCompleteMission(false)}
                              disabled={loading}
                              variant="destructive"
                              className="flex-1"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Não Consegui
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {response && response.player_notes && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Suas observações:</p>
                    <p className="text-sm text-muted-foreground">{response.player_notes}</p>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
