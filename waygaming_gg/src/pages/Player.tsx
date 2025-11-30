import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/AuthGuard";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { MissionsPlayer } from "@/components/MissionsPlayer";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Trophy, Calendar as CalendarIcon, BookOpen, Mail, Bell, Reply } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChampionSelectModal } from "@/components/ChampionSelectModal";
import { getChampionsList, getChampionImageUrlSync, getLatestVersion, type Champion } from "@/lib/ddragon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

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

const Player = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [version, setVersion] = useState("");
  const [favoriteChampions, setFavoriteChampions] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [eventsCount, setEventsCount] = useState(0);
  const [evolution, setEvolution] = useState(0);
  const [evolutionAverage, setEvolutionAverage] = useState<number | null>(null);
  const [evolutionPercent, setEvolutionPercent] = useState(0);
  const [recentEvaluations, setRecentEvaluations] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [wayPoints, setWayPoints] = useState(0);

  useEffect(() => {
    loadMessages();
    loadChampions();
    loadFavoriteChampions();
    loadEvaluations();
    loadEvents();
    loadWayPoints();
    
    // Setup realtime subscription for messages
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const channel = supabase
        .channel('messages-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            toast({
              title: "Nova mensagem!",
              description: payload.new.subject,
            });
            loadMessages();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'events'
          },
          (payload) => {
            toast({
              title: "Novo evento!",
              description: payload.new.title,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, []);

  const loadMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
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

    // Build thread structure
    messageMap.forEach(message => {
      if (message.parent_message_id) {
        const parent = messageMap.get(message.parent_message_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(message);
        }
      } else if (message.recipient_id === user.id) {
        // Only show root messages where user is recipient in main view
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
    setUnreadCount(rootMessages.filter(m => !m.read).length);
  };

  const loadChampions = async () => {
    const currentVersion = await getLatestVersion();
    setVersion(currentVersion);
    const data = await getChampionsList();
    setChampions(data);
  };

  const loadFavoriteChampions = () => {
    const saved = localStorage.getItem('favoriteChampions');
    if (saved) {
      setFavoriteChampions(JSON.parse(saved));
    }
  };

  const loadEvaluations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Carregar média mensal atual
    const { data: currentMonthSummary } = await supabase
      .from("monthly_evaluation_summary")
      .select("*")
      .eq("player_id", user.id)
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .maybeSingle();

    if (currentMonthSummary) {
      setAverageRating(currentMonthSummary.average_score);
    }

    // Carregar histórico mensal para cálculo de evolução
    const { data: monthlyData } = await supabase
      .from("monthly_evaluation_summary")
      .select("*")
      .eq("player_id", user.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12);

    if (monthlyData && monthlyData.length > 0) {
      setMonthlyHistory(monthlyData);
      
      // Calcular evolução comparando mês atual com mês anterior
      if (monthlyData.length >= 2) {
        const currentAvg = monthlyData[0].average_score;
        const previousAvg = monthlyData[1].average_score;
        
        if (previousAvg > 0) {
          const evolutionPercent = ((currentAvg - previousAvg) / previousAvg) * 100;
          setEvolution(Math.round(evolutionPercent));
        }
      }
    }

    // Carregar avaliações de evolução do mês atual
    const { data: evolutionData } = await supabase
      .from("evolution_evaluations")
      .select("*")
      .eq("player_id", user.id)
      .eq("month", currentMonth)
      .eq("year", currentYear);

    if (evolutionData && evolutionData.length > 0) {
      // Calcular média das avaliações de evolução do mês
      const totalAvg = evolutionData.reduce((sum, ev) => sum + (ev.average_score || 0), 0);
      const monthAvg = totalAvg / evolutionData.length;
      setEvolutionAverage(monthAvg);

      // Buscar mês anterior para calcular evolução percentual
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const { data: prevEvolutionData } = await supabase
        .from("evolution_evaluations")
        .select("*")
        .eq("player_id", user.id)
        .eq("month", prevMonth)
        .eq("year", prevYear);

      if (prevEvolutionData && prevEvolutionData.length > 0) {
        const prevTotalAvg = prevEvolutionData.reduce((sum, ev) => sum + (ev.average_score || 0), 0);
        const prevMonthAvg = prevTotalAvg / prevEvolutionData.length;
        
        if (prevMonthAvg > 0) {
          const evolutionPct = ((monthAvg - prevMonthAvg) / prevMonthAvg) * 100;
          setEvolutionPercent(Math.round(evolutionPct));
        }
      }
    }

    // Carregar avaliações recentes do mês atual
    const { data, error } = await supabase
      .from("evaluations")
      .select("*, profiles!evaluations_coach_id_fkey(full_name)")
      .eq("player_id", user.id)
      .gte("created_at", new Date(currentYear, currentMonth - 1, 1).toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentEvaluations(data);
    }
  };

  const loadEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Carregar eventos participados
    const { data: responses, error: responsesError } = await supabase
      .from("event_responses")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    if (!responsesError && responses) {
      setEventsCount(responses.length);
    }

    // Carregar próximos eventos
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select(`
        *,
        event_responses!left(status)
      `)
      .gte("start_date", new Date().toISOString())
      .order("start_date", { ascending: true })
      .limit(5);

    if (!eventsError && events) {
      setUpcomingEvents(events);
    }
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

  const handleMarkAsRead = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("id", messageId);

    if (error) {
      console.error("Error marking message as read:", error);
      return;
    }

    loadMessages();
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMessage || !replyContent.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: selectedMessage.sender_id,
      subject: `Re: ${selectedMessage.subject}`,
      content: replyContent,
      parent_message_id: selectedMessage.id
    });

    if (error) {
      toast({
        title: "Erro ao enviar resposta",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Resposta enviada",
        description: "A resposta foi enviada com sucesso."
      });
      setReplyOpen(false);
      setReplyContent("");
      setSelectedMessage(null);
      loadMessages();
    }
  };

  const handleAddFavoriteChampion = (champion: Champion) => {
    if (favoriteChampions.length >= 10) {
      toast({
        title: "Limite atingido",
        description: "Você pode ter no máximo 10 campeões favoritos",
        variant: "destructive",
      });
      return;
    }

    const newFavorites = [...favoriteChampions, champion.name];
    setFavoriteChampions(newFavorites);
    localStorage.setItem('favoriteChampions', JSON.stringify(newFavorites));
    setModalOpen(false);
    toast({
      title: "Campeão adicionado!",
      description: `${champion.name} foi adicionado aos seus favoritos`,
    });
  };

  const handleRemoveFavoriteChampion = (championName: string) => {
    const newFavorites = favoriteChampions.filter(c => c !== championName);
    setFavoriteChampions(newFavorites);
    localStorage.setItem('favoriteChampions', JSON.stringify(newFavorites));
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Área do Player
              </h1>
              <p className="text-muted-foreground">
                Acompanhe seu desempenho e participe dos eventos
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="relative"
                onClick={() => document.getElementById('messages-tab')?.click()}
              >
                <Bell className="w-4 h-4 mr-2" />
                Notificações
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <UserProfileDropdown />
            </div>
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">
                <Trophy className="w-4 h-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="messages" id="messages-tab">
                <Mail className="w-4 h-4 mr-2" />
                Mensagens
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 flex items-center justify-center p-0">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendário
              </TabsTrigger>
              <TabsTrigger value="champions">
                <BookOpen className="w-4 h-4 mr-2" />
                Campeões
              </TabsTrigger>
              <TabsTrigger value="missions">
                Missões
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <Card className="glass-card p-6 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Avaliação Média
                      </p>
                      <h3 className="text-3xl font-bold mt-2">
                        {averageRating !== null ? averageRating.toFixed(1) : "-"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Avaliações gerais
                      </p>
                    </div>
                    <Trophy className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </Card>

                <Card className="glass-card p-6 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Avaliação de Evolução
                      </p>
                      <h3 className="text-3xl font-bold mt-2">
                        {evolutionAverage !== null ? evolutionAverage.toFixed(1) : "-"}
                      </h3>
                      <p className={`text-xs mt-1 ${evolutionPercent >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {evolutionPercent > 0 ? '+' : ''}{evolutionPercent}% vs mês anterior
                      </p>
                    </div>
                    <Trophy className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </Card>

                <Card className="glass-card p-6 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Eventos Participados
                      </p>
                      <h3 className="text-3xl font-bold mt-2">{eventsCount}</h3>
                    </div>
                    <CalendarIcon className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </Card>

                <Card className="glass-card p-6 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Campeões Dominados
                      </p>
                      <h3 className="text-3xl font-bold mt-2">{favoriteChampions.length}</h3>
                    </div>
                    <BookOpen className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </Card>

                <Card className="glass-card p-6 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Evolução</p>
                      <h3 className={`text-3xl font-bold mt-2 ${evolution >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {evolution > 0 ? '+' : ''}{evolution}%
                      </h3>
                    </div>
                    <Trophy className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </Card>

                <Card className="glass-card p-6 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Way Points</p>
                      <h3 className="text-3xl font-bold mt-2 text-primary">
                        {wayPoints}
                      </h3>
                    </div>
                    <Trophy className="w-10 h-10 text-primary opacity-50" />
                  </div>
                </Card>
              </div>

              <Card className="glass-card p-6 border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Meus Campeões Favoritos</h3>
                  {favoriteChampions.length < 10 && (
                    <Button size="sm" onClick={() => setModalOpen(true)}>
                      Adicionar Campeão
                    </Button>
                  )}
                </div>
                {favoriteChampions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Selecione até 10 campeões favoritos
                  </p>
                ) : (
                  <div className="grid grid-cols-8 gap-2">
                    {favoriteChampions.map((championName) => (
                      <div key={championName} className="relative group">
                        <div className="aspect-square rounded-md overflow-hidden border border-primary/50">
                          <img
                            src={getChampionImageUrlSync(championName, version)}
                            alt={championName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveFavoriteChampion(championName)}
                        >
                          ×
                        </Button>
                        <p className="text-[10px] text-center mt-0.5 truncate">{championName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="glass-card p-6 border-border/30">
                  <h3 className="text-xl font-bold mb-4">Avaliações do Mês</h3>
                  {recentEvaluations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma avaliação ainda neste mês
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentEvaluations.map((evaluation) => (
                        <div key={evaluation.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                          <div>
                            <p className="font-medium">{evaluation.category}</p>
                            <p className="text-xs text-muted-foreground">
                              Por: {evaluation.profiles?.full_name || 'Coach'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(evaluation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {evaluation.score !== null ? evaluation.score : '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="glass-card p-6 border-border/30">
                  <h3 className="text-xl font-bold mb-4">Histórico Mensal</h3>
                  {monthlyHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum histórico disponível
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {monthlyHistory.slice(0, 6).map((summary) => (
                        <div key={summary.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                          <div>
                            <p className="font-medium">
                              {new Date(summary.year, summary.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {summary.total_evaluations} avaliações
                            </p>
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {summary.average_score ? summary.average_score.toFixed(1) : '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Mensagens</h2>
                    <p className="text-muted-foreground">Suas mensagens recebidas</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>De</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhuma mensagem encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      messages.map((message) => (
                        <>
                          <TableRow key={message.id} className={!message.read ? "bg-primary/5" : ""}>
                            <TableCell className="font-medium">
                              {message.sender_profile?.full_name || "Desconhecido"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {message.subject}
                              {message.replies && message.replies.length > 0 && (
                                <Badge variant="outline" className="ml-2">
                                  {message.replies.length} {message.replies.length === 1 ? 'resposta' : 'respostas'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-md truncate">{message.content}</TableCell>
                            <TableCell>{format(new Date(message.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                            <TableCell>
                              {message.read ? (
                                <Badge variant="secondary">Lida</Badge>
                              ) : (
                                <Badge>Não lida</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {!message.read && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleMarkAsRead(message.id)}
                                  >
                                    Marcar como lida
                                  </Button>
                                )}
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
                              </div>
                            </TableCell>
                          </TableRow>
                          {message.replies && message.replies.length > 0 && message.replies.map(reply => (
                            <TableRow key={reply.id} className="bg-muted/30">
                              <TableCell className="pl-8">
                                <span className="text-sm">↳ {reply.sender_profile?.full_name || "Você"}</span>
                              </TableCell>
                              <TableCell colSpan={2} className="text-sm">{reply.content}</TableCell>
                              <TableCell>{format(new Date(reply.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                              <TableCell colSpan={2}></TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="calendar">
              <MonthlyCalendar />
            </TabsContent>

            <TabsContent value="champions">
              <Card className="glass-card p-6 border-border/30">
                <h2 className="text-2xl font-bold mb-6">
                  Pool de Campeões
                </h2>
                <p className="text-center text-muted-foreground py-8">
                  Em breve: informações detalhadas sobre seus campeões
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="missions">
              <MissionsPlayer />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ChampionSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        champions={champions.filter(c => !favoriteChampions.includes(c.name))}
        onSelect={handleAddFavoriteChampion}
        version={version}
        title="Selecionar Campeão Favorito"
      />

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

export default Player;
