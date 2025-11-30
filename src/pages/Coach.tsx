import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Upload, Sparkles, LogOut, Trash2, Send, Mail, Reply, Trophy } from "lucide-react";
import { TeamManagement } from "@/components/TeamManagement";
import { MatchHistory } from "@/components/MatchHistory";
import { SummonerSearch } from "@/components/SummonerSearch";
import { AuthGuard } from "@/components/AuthGuard";
import { ChampionSelectModal } from "@/components/ChampionSelectModal";
import { Calendar } from "@/components/Calendar";
import { MissionsCoach } from "@/components/MissionsCoach";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getChampionsList, getChampionImageUrlSync, getLatestVersion, type Champion } from "@/lib/ddragon";
import { toast as sonnerToast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type RoleKey = "top" | "jungle" | "mid" | "adc" | "support";

type Composition = {
  id: string;
  name: string;
  top_champion: string;
  jungle_champion: string;
  mid_champion: string;
  adc_champion: string;
  support_champion: string;
  notes: string | null;
  created_at: string;
};

type Player = {
  id: string;
  name: string;
  nickname: string;
  role: string;
  user_id: string;
  player_user_id: string;
};

type Message = {
  id: string;
  subject: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_id: string;
  recipient_id: string;
  parent_message_id: string | null;
  sender_profile?: {
    full_name: string;
    email: string;
  };
  replies?: Message[];
};

type Evaluation = {
  id: string;
  player_id: string;
  score: number;
  category: string;
  notes: string | null;
  created_at: string;
};

const Coach = () => {
  const { toast } = useToast();
  const [champions, setChampions] = useState<Champion[]>([]);
  const [version, setVersion] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [composition, setComposition] = useState<Record<RoleKey, string>>({
    top: "",
    jungle: "",
    mid: "",
    adc: "",
    support: ""
  });
  const [notes, setNotes] = useState("");
  const [compName, setCompName] = useState("");
  const [savedCompositions, setSavedCompositions] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Messages state
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [newMessage, setNewMessage] = useState({ recipient_id: "", subject: "", content: "" });
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  
  // Evaluations state
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [newEvaluation, setNewEvaluation] = useState({ player_id: "", score: 0, category: "", notes: "" });
  
  // Evolution evaluations state
  const [evolutionCategories, setEvolutionCategories] = useState<any[]>([]);
  const [evolutionEvaluations, setEvolutionEvaluations] = useState<any[]>([]);
  const [showEvolutionDialog, setShowEvolutionDialog] = useState(false);
  const [evolutionScores, setEvolutionScores] = useState<Record<string, number>>({});
  const [evolutionNotes, setEvolutionNotes] = useState("");
  const [selectedEvolutionPlayer, setSelectedEvolutionPlayer] = useState("");
  
  // My evaluations state (received from staff)
  const [myEvaluations, setMyEvaluations] = useState<any[]>([]);
  const [myEvolutionEvaluations, setMyEvolutionEvaluations] = useState<any[]>([]);
  const [myMonthlyAverages, setMyMonthlyAverages] = useState<any[]>([]);
  const [wayPoints, setWayPoints] = useState(0);

  useEffect(() => {
    loadChampions();
    loadSavedCompositions();
    loadPlayers();
    loadMessages();
    loadEvaluations();
    loadEvolutionCategories();
    loadEvolutionEvaluations();
    loadMyEvaluations();
    loadWayPoints();
  }, []);

  const loadChampions = async () => {
    const currentVersion = await getLatestVersion();
    setVersion(currentVersion);
    const data = await getChampionsList();
    setChampions(data);
  };

  const loadSavedCompositions = async () => {
    const { data, error } = await supabase
      .from("team_compositions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading compositions:", error);
      return;
    }

    setSavedCompositions(data || []);
  };

  const loadPlayers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .order("role");

    if (error) {
      console.error("Error loading team players:", error);
      return;
    }

    setPlayers(data || []);
  };

  const loadMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    // Fetch profiles for sender info
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    // Group messages by thread
    const messageMap = new Map<string, Message>();
    const rootMessages: Message[] = [];

    data?.forEach(message => {
      const messageWithProfile = {
        ...message,
        sender_profile: profilesData?.find(p => p.id === message.sender_id) || { full_name: "Unknown", email: "" },
        replies: []
      };
      messageMap.set(message.id, messageWithProfile);
    });

    // Build thread structure - only show messages where user is sender or recipient
    messageMap.forEach(message => {
      if (message.parent_message_id) {
        const parent = messageMap.get(message.parent_message_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(message);
        }
      } else {
        rootMessages.push(message);
      }
    });

    // Sort replies
    rootMessages.forEach(msg => {
      if (msg.replies) {
        msg.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });

    setMessages(rootMessages);
  };

  const loadEvaluations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("evaluations")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading evaluations:", error);
      return;
    }

    setEvaluations(data || []);
  };

  const handleRoleClick = (role: RoleKey) => {
    setSelectedRole(role);
    setModalOpen(true);
  };

  const handleChampionSelect = (champion: Champion) => {
    if (selectedRole) {
      setComposition(prev => ({
        ...prev,
        [selectedRole]: champion.name
      }));
    }
  };

  const handleSaveComposition = async () => {
    const allRolesFilled = Object.values(composition).every(champ => champ !== "");
    
    if (!allRolesFilled) {
      sonnerToast.error("Selecione todos os 5 campeões antes de salvar");
      return;
    }

    if (!compName.trim()) {
      sonnerToast.error("Digite um nome para a composição");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      sonnerToast.error("Você precisa estar logado");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("team_compositions").insert({
      user_id: user.id,
      name: compName,
      top_champion: composition.top,
      jungle_champion: composition.jungle,
      mid_champion: composition.mid,
      adc_champion: composition.adc,
      support_champion: composition.support,
      notes: notes || null
    } as any);

    setLoading(false);

    if (error) {
      console.error("Error saving composition:", error);
      sonnerToast.error("Erro ao salvar composição");
      return;
    }

    sonnerToast.success("Composição salva com sucesso!");
    setComposition({ top: "", jungle: "", mid: "", adc: "", support: "" });
    setNotes("");
    setCompName("");
    loadSavedCompositions();
  };

  const handleDeleteComposition = async (id: string) => {
    const { error } = await supabase
      .from("team_compositions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting composition:", error);
      sonnerToast.error("Erro ao deletar composição");
      return;
    }

    sonnerToast.success("Composição deletada");
    loadSavedCompositions();
  };

  const handleLoadComposition = (comp: Composition) => {
    setComposition({
      top: comp.top_champion,
      jungle: comp.jungle_champion,
      mid: comp.mid_champion,
      adc: comp.adc_champion,
      support: comp.support_champion
    });
    setNotes(comp.notes || "");
    setCompName(comp.name);
    sonnerToast.success("Composição carregada");
  };

  const handleSendMessage = async () => {
    if (!newMessage.recipient_id) {
      sonnerToast.error("Selecione um destinatário");
      return;
    }
    if (!newMessage.subject?.trim()) {
      sonnerToast.error("Preencha o assunto da mensagem");
      return;
    }
    if (!newMessage.content?.trim()) {
      sonnerToast.error("Escreva o conteúdo da mensagem");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id: newMessage.recipient_id,
        subject: newMessage.subject,
        content: newMessage.content
      });

    if (error) {
      sonnerToast.error("Erro ao enviar mensagem");
      return;
    }

    sonnerToast.success("Mensagem enviada com sucesso!");
    setShowMessageDialog(false);
    setNewMessage({ recipient_id: "", subject: "", content: "" });
    loadMessages();
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMessage || !replyContent.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Reply goes to the original sender if current user is not the sender
    const recipientId = selectedMessage.sender_id === user.id 
      ? selectedMessage.recipient_id 
      : selectedMessage.sender_id;

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      subject: `Re: ${selectedMessage.subject}`,
      content: replyContent,
      parent_message_id: selectedMessage.id
    });

    if (error) {
      sonnerToast.error("Erro ao enviar resposta");
      return;
    }

    sonnerToast.success("Resposta enviada com sucesso!");
    setReplyOpen(false);
    setReplyContent("");
    setSelectedMessage(null);
    loadMessages();
  };

  const handleCreateEvaluation = async () => {
    if (!newEvaluation.player_id || !newEvaluation.category || newEvaluation.score === 0) {
      sonnerToast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("evaluations")
      .insert({
        coach_id: user.id,
        player_id: newEvaluation.player_id,
        score: newEvaluation.score,
        category: newEvaluation.category,
        notes: newEvaluation.notes || null
      });

    if (error) {
      sonnerToast.error("Erro ao criar avaliação");
      return;
    }

    sonnerToast.success("Avaliação criada com sucesso!");
    setShowEvaluationDialog(false);
    setNewEvaluation({ player_id: "", score: 0, category: "", notes: "" });
    loadEvaluations();
  };

  const loadEvolutionCategories = async () => {
    const { data, error } = await supabase
      .from("evolution_categories")
      .select("*")
      .order("name");

    if (!error && data) {
      setEvolutionCategories(data);
      // Initialize scores object
      const initialScores: Record<string, number> = {};
      data.forEach(cat => initialScores[cat.id] = 5);
      setEvolutionScores(initialScores);
    }
  };

  const loadEvolutionEvaluations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const { data, error } = await supabase
      .from("evolution_evaluations")
      .select("*")
      .eq("evaluator_id", user.id)
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading evolution evaluations:", error);
      return;
    }

    setEvolutionEvaluations(data || []);
  };

  const handleCreateEvolutionEvaluation = async () => {
    if (!selectedEvolutionPlayer) {
      sonnerToast.error("Selecione um jogador");
      return;
    }

    // Verificar se todas as categorias foram avaliadas
    const allScored = evolutionCategories.every(cat => evolutionScores[cat.id] > 0);
    if (!allScored) {
      sonnerToast.error("Avalie todas as categorias");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Calcular média
    const scores = Object.values(evolutionScores);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    const { error } = await supabase
      .from("evolution_evaluations")
      .insert({
        evaluator_id: user.id,
        player_id: selectedEvolutionPlayer,
        month: currentMonth,
        year: currentYear,
        category_scores: evolutionScores,
        average_score: average,
        notes: evolutionNotes || null
      });

    if (error) {
      sonnerToast.error("Erro ao criar avaliação de evolução");
      return;
    }

    sonnerToast.success("Avaliação de evolução criada com sucesso!");
    setShowEvolutionDialog(false);
    setSelectedEvolutionPlayer("");
    setEvolutionNotes("");
    // Reset scores
    const resetScores: Record<string, number> = {};
    evolutionCategories.forEach(cat => resetScores[cat.id] = 5);
    setEvolutionScores(resetScores);
    loadEvolutionEvaluations();
  };

  const loadMyEvaluations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load standard evaluations where coach is being evaluated
    const { data: evalData } = await supabase
      .from("evaluations")
      .select("*")
      .eq("player_id", user.id)
      .order("created_at", { ascending: false });

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    const evaluationsWithProfiles = evalData?.map(evaluation => ({
      ...evaluation,
      evaluator_profile: profilesData?.find(p => p.id === evaluation.coach_id) || { full_name: "Unknown", email: "" }
    })) || [];

    setMyEvaluations(evaluationsWithProfiles);

    // Load evolution evaluations
    const { data: evolutionData } = await supabase
      .from("evolution_evaluations")
      .select("*")
      .eq("player_id", user.id)
      .order("created_at", { ascending: false });

    const evolutionsWithProfiles = evolutionData?.map(evolution => ({
      ...evolution,
      evaluator_profile: profilesData?.find(p => p.id === evolution.evaluator_id) || { full_name: "Unknown", email: "" }
    })) || [];

    setMyEvolutionEvaluations(evolutionsWithProfiles);

    // Load monthly averages
    const { data: monthlyData } = await supabase
      .from("monthly_evaluation_summary")
      .select("*")
      .eq("player_id", user.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    setMyMonthlyAverages(monthlyData || []);
  };

  const loadWayPoints = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const { data, error } = await supabase
      .from("way_point_assignments")
      .select("total_points")
      .eq("player_id", user.id)
      .eq("month", currentMonth)
      .eq("year", currentYear);

    if (!error && data) {
      const total = data.reduce((sum, item) => sum + item.total_points, 0);
      setWayPoints(total);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleDisplayName = (role: RoleKey) => {
    const names = {
      top: "Top",
      jungle: "Jungle",
      mid: "Mid",
      adc: "ADC",
      support: "Support"
    };
    return names[role];
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Área do Coach
              </h1>
              <p className="text-muted-foreground">
                Crie composições, faça anotações e receba análises com IA
              </p>
            </div>
            <UserProfileDropdown />
          </div>

          <Tabs defaultValue="composition" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="composition">Composições</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              <TabsTrigger value="evaluations">Avaliações</TabsTrigger>
              <TabsTrigger value="evolution">Evolução</TabsTrigger>
              <TabsTrigger value="my-evaluations">Minhas Avaliações</TabsTrigger>
              <TabsTrigger value="calendar">Calendário</TabsTrigger>
              <TabsTrigger value="missions">Missões</TabsTrigger>
            </TabsList>

            <TabsContent value="composition" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <TeamManagement />
                <MatchHistory />
                <SummonerSearch />
              </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Composition Builder */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card p-6 border-primary/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Nova Composição</h2>
                <Button 
                  onClick={handleSaveComposition}
                  disabled={loading}
                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Salvar Comp
                </Button>
              </div>

              <div className="mb-4">
                <Input
                  placeholder="Nome da composição..."
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="glass-card border-border/50 focus:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-5 gap-3 mb-6">
                {(["top", "jungle", "mid", "adc", "support"] as RoleKey[]).map((role) => (
                  <div key={role} className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {getRoleDisplayName(role)}
                    </span>
                    {composition[role] ? (
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-primary/50 relative group cursor-pointer">
                        <img
                          src={getChampionImageUrlSync(composition[role], version)}
                          alt={composition[role]}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setComposition(prev => ({ ...prev, [role]: "" }))}
                            className="text-xs"
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => handleRoleClick(role)}
                        className="aspect-square rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground text-xs hover:border-primary/50 cursor-pointer transition-all"
                      >
                        Selecionar
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Notas Táticas
                </label>
                <Textarea
                  placeholder="Adicione estratégias, win conditions, timings importantes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[150px] glass-card border-border/50 focus:border-primary/50"
                />
              </div>
            </Card>

            {/* AI Analysis */}
            <Card className="glass-card p-6 border-accent/30 glow-gold">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="text-xl font-bold text-accent">Análise IA da Composição</h3>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-sm text-muted-foreground italic">
                    Selecione os 5 campeões para receber uma análise detalhada sobre:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex items-start space-x-2">
                      <span className="text-accent">•</span>
                      <span>Pontos fortes e fracos da composição</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-accent">•</span>
                      <span>Win conditions e timing de power spikes</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-accent">•</span>
                      <span>Sinergia entre campeões e habilidades</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-accent">•</span>
                      <span>Sugestões de melhorias</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar - Saved Comps & Notes */}
          <div className="space-y-6">
            <Card className="glass-card p-6 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Composições Salvas</h3>
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {savedCompositions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma composição salva
                  </p>
                ) : (
                  savedCompositions.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 cursor-pointer" onClick={() => handleLoadComposition(comp)}>
                          <p className="font-medium text-sm mb-1">{comp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comp.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteComposition(comp.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[comp.top_champion, comp.jungle_champion, comp.mid_champion, comp.adc_champion, comp.support_champion].map((champ, i) => (
                          <div key={i} className="w-8 h-8 rounded border border-border/30 overflow-hidden">
                            <img
                              src={getChampionImageUrlSync(champ, version)}
                              alt={champ}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="glass-card p-6 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Upload de Scrims</h3>
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <Button variant="outline" className="w-full border-dashed border-border/50 hover:border-primary/50">
                <Upload className="w-4 h-4 mr-2" />
                Fazer Upload
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Formatos: .webm, .mp4, .rofl
              </p>
            </Card>
          </div>
        </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Mensagens</h2>
                    <p className="text-muted-foreground">Comunicação com os jogadores</p>
                  </div>
                  <Button onClick={() => setShowMessageDialog(true)}>
                    <Send className="mr-2 h-4 w-4" />
                    Nova Mensagem
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>De/Para</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhuma mensagem encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      messages.map((message) => (
                        <>
                          <TableRow key={message.id}>
                            <TableCell>
                              {message.sender_profile?.full_name || "Desconhecido"}
                            </TableCell>
                            <TableCell>
                              {message.subject}
                              {message.replies && message.replies.length > 0 && (
                                <Badge variant="outline" className="ml-2">
                                  {message.replies.length} {message.replies.length === 1 ? 'resposta' : 'respostas'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{format(new Date(message.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                            <TableCell>
                              {message.read ? (
                                <Badge variant="secondary">Lida</Badge>
                              ) : (
                                <Badge>Não lida</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedMessage(message);
                                  setReplyOpen(true);
                                }}
                              >
                                <Reply className="h-3 w-3 mr-1" />
                                Responder
                              </Button>
                            </TableCell>
                          </TableRow>
                          {message.replies && message.replies.length > 0 && message.replies.map(reply => (
                            <TableRow key={reply.id} className="bg-muted/30">
                              <TableCell className="pl-8">
                                <span className="text-sm">↳ {reply.sender_profile?.full_name || "Você"}</span>
                              </TableCell>
                              <TableCell colSpan={2} className="text-sm">{reply.content}</TableCell>
                              <TableCell>{format(new Date(reply.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="evaluations" className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Avaliações</h2>
                    <p className="text-muted-foreground">Avalie o desempenho dos jogadores</p>
                  </div>
                  <Button onClick={() => setShowEvaluationDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Avaliação
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogador</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhuma avaliação encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      evaluations.map((evaluation) => {
                        const player = players.find(p => p.player_user_id === evaluation.player_id);
                        return (
                          <TableRow key={evaluation.id}>
                            <TableCell>{player?.nickname || player?.name || "N/A"}</TableCell>
                            <TableCell>{evaluation.category}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{evaluation.score}/10</Badge>
                            </TableCell>
                            <TableCell>{new Date(evaluation.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="evolution" className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Avaliação de Evolução</h2>
                    <p className="text-muted-foreground">Avalie múltiplas categorias do jogador - Mensal</p>
                  </div>
                  <Button onClick={() => setShowEvolutionDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Avaliação de Evolução
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogador</TableHead>
                      <TableHead>Média</TableHead>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evolutionEvaluations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhuma avaliação de evolução encontrada neste mês
                        </TableCell>
                      </TableRow>
                    ) : (
                      evolutionEvaluations.map((evaluation) => {
                        const player = players.find(p => p.player_user_id === evaluation.player_id);
                        return (
                          <TableRow key={evaluation.id}>
                            <TableCell>{player?.nickname || player?.name || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{evaluation.average_score ? evaluation.average_score.toFixed(1) : 'N/A'}/10</Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(evaluation.year, evaluation.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </TableCell>
                            <TableCell>{new Date(evaluation.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="my-evaluations" className="space-y-6">
              <Card className="glass-card p-6 border-primary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Way Points (Mês Atual)</p>
                    <h3 className="text-3xl font-bold mt-2 text-primary">
                      {wayPoints}
                    </h3>
                  </div>
                  <Trophy className="w-10 h-10 text-primary opacity-50" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Minhas Avaliações</h2>
                  <p className="text-muted-foreground">Avaliações recebidas do staff</p>
                </div>

                <Tabs defaultValue="standard" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="standard">Gerais</TabsTrigger>
                    <TabsTrigger value="evolution">Evolução</TabsTrigger>
                    <TabsTrigger value="monthly">Médias Mensais</TabsTrigger>
                  </TabsList>

                  <TabsContent value="standard">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Avaliador</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Nota</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myEvaluations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Nenhuma avaliação recebida
                            </TableCell>
                          </TableRow>
                        ) : (
                          myEvaluations.map(evaluation => (
                            <TableRow key={evaluation.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{evaluation.evaluator_profile.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{evaluation.evaluator_profile.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{evaluation.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{evaluation.score}/10</Badge>
                              </TableCell>
                              <TableCell>{new Date(evaluation.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="max-w-xs">
                                {evaluation.notes && <p className="text-sm">{evaluation.notes}</p>}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="evolution">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Avaliador</TableHead>
                          <TableHead>Mês/Ano</TableHead>
                          <TableHead>Média</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myEvolutionEvaluations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Nenhuma avaliação de evolução recebida
                            </TableCell>
                          </TableRow>
                        ) : (
                          myEvolutionEvaluations.map(evolution => (
                            <TableRow key={evolution.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{evolution.evaluator_profile.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{evolution.evaluator_profile.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {new Date(evolution.year, evolution.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {evolution.average_score ? evolution.average_score.toFixed(1) : 'N/A'}/10
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(evolution.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="max-w-xs">
                                {evolution.notes && <p className="text-sm">{evolution.notes}</p>}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="monthly">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês/Ano</TableHead>
                          <TableHead>Média</TableHead>
                          <TableHead>Total de Avaliações</TableHead>
                          <TableHead>Última Atualização</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myMonthlyAverages.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Nenhuma média mensal calculada
                            </TableCell>
                          </TableRow>
                        ) : (
                          myMonthlyAverages.map(summary => (
                            <TableRow key={summary.id}>
                              <TableCell>
                                {new Date(summary.year, summary.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{summary.average_score ? summary.average_score.toFixed(1) : 'N/A'}/10</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{summary.total_evaluations}</Badge>
                              </TableCell>
                              <TableCell>{new Date(summary.updated_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </Card>
            </TabsContent>

            <TabsContent value="calendar">
              <Calendar />
            </TabsContent>

            <TabsContent value="missions">
              <MissionsCoach />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ChampionSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        champions={champions}
        onSelect={handleChampionSelect}
        version={version}
        title={selectedRole ? `Selecionar ${getRoleDisplayName(selectedRole)}` : "Selecionar Campeão"}
      />

      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Mensagem</DialogTitle>
            <DialogDescription>Envie uma mensagem para um jogador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">Destinatário *</Label>
              <Select value={newMessage.recipient_id} onValueChange={(value) => setNewMessage({ ...newMessage, recipient_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um jogador" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {players.filter(p => p.player_user_id).length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {players.length === 0 ? "Nenhum jogador na equipe" : "Jogadores antigos precisam ser removidos e adicionados novamente"}
                    </div>
                  ) : (
                    players.filter(p => p.player_user_id).map((player) => (
                      <SelectItem key={player.player_user_id} value={player.player_user_id}>
                        {player.nickname} ({player.name})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="content">Mensagem *</Label>
              <Textarea
                id="content"
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendMessage}>
              <Send className="mr-2 h-4 w-4" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Avaliação</DialogTitle>
            <DialogDescription>Avalie o desempenho de um jogador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="player">Jogador *</Label>
              <Select value={newEvaluation.player_id} onValueChange={(value) => setNewEvaluation({ ...newEvaluation, player_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um jogador" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {players.filter(p => p.player_user_id).length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {players.length === 0 ? "Nenhum jogador na equipe" : "Jogadores antigos precisam ser removidos e adicionados novamente"}
                    </div>
                  ) : (
                    players.filter(p => p.player_user_id).map((player) => (
                      <SelectItem key={player.player_user_id} value={player.player_user_id}>
                        {player.nickname} ({player.name})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select value={newEvaluation.category} onValueChange={(value) => setNewEvaluation({ ...newEvaluation, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="Micro">Micro</SelectItem>
                  <SelectItem value="Macro">Macro</SelectItem>
                  <SelectItem value="Comportamental">Comportamental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="score">Nota * (0-10)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="10"
                value={newEvaluation.score}
                onChange={(e) => setNewEvaluation({ ...newEvaluation, score: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="eval-notes">Observações</Label>
              <Textarea
                id="eval-notes"
                value={newEvaluation.notes}
                onChange={(e) => setNewEvaluation({ ...newEvaluation, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvaluationDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEvaluation}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEvolutionDialog} onOpenChange={setShowEvolutionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Avaliação de Evolução</DialogTitle>
            <DialogDescription>Avalie o jogador em múltiplas categorias - Mensal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="evolution-player">Jogador *</Label>
              <Select value={selectedEvolutionPlayer} onValueChange={setSelectedEvolutionPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um jogador" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {players.filter(p => p.player_user_id).length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {players.length === 0 ? "Nenhum jogador na equipe" : "Jogadores antigos precisam ser removidos e adicionados novamente"}
                    </div>
                  ) : (
                    players.filter(p => p.player_user_id).map((player) => (
                      <SelectItem key={player.player_user_id} value={player.player_user_id}>
                        {player.nickname} ({player.name})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-background/50">
              <h3 className="font-semibold text-sm">Avalie cada categoria (1-10)</h3>
              {evolutionCategories.map((category) => (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{category.name}</Label>
                      {category.description && (
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {evolutionScores[category.id] || 5}/10
                    </Badge>
                  </div>
                  <Input
                    type="range"
                    min="1"
                    max="10"
                    value={evolutionScores[category.id] || 5}
                    onChange={(e) => setEvolutionScores({
                      ...evolutionScores,
                      [category.id]: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>
              ))}
              
              {evolutionCategories.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Média Final:</span>
                    <Badge className="text-lg">
                      {(Object.values(evolutionScores).reduce((a, b) => a + b, 0) / evolutionCategories.length).toFixed(1)}/10
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="evolution-notes">Observações Gerais</Label>
              <Textarea
                id="evolution-notes"
                value={evolutionNotes}
                onChange={(e) => setEvolutionNotes(e.target.value)}
                rows={4}
                placeholder="Comentários sobre a evolução geral do jogador..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvolutionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEvolutionEvaluation}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Responder Mensagem</DialogTitle>
            <DialogDescription>
              Respondendo para: {selectedMessage?.subject}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReply} className="space-y-4">
            <div>
              <Label htmlFor="reply-content">Sua Resposta</Label>
              <Textarea
                id="reply-content"
                required
                rows={5}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Digite sua resposta..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReplyOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Reply className="h-4 w-4 mr-2" />
                Enviar Resposta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
};

export default Coach;
