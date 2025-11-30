import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Evaluation {
  id: string;
  player_id: string;
  coach_id: string;
  score: number;
  category: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  player_profile: {
    full_name: string;
    email: string;
  };
  coach_profile: {
    full_name: string;
    email: string;
  };
}

export default function AdminEvaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    player_id: "",
    coach_id: "",
    score: "",
    category: "",
    notes: ""
  });
  const [evolutionEvaluations, setEvolutionEvaluations] = useState<any[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // Evolution evaluation state
  const [evolutionCategories, setEvolutionCategories] = useState<any[]>([]);
  const [showEvolutionDialog, setShowEvolutionDialog] = useState(false);
  const [evolutionScores, setEvolutionScores] = useState<Record<string, number>>({});
  const [evolutionNotes, setEvolutionNotes] = useState("");
  const [selectedEvolutionPlayer, setSelectedEvolutionPlayer] = useState("");
  
  // Tryout evaluation state (same structure as evolution)
  const [tryoutEvaluations, setTryoutEvaluations] = useState<any[]>([]);
  const [showTryoutDialog, setShowTryoutDialog] = useState(false);
  const [tryoutScores, setTryoutScores] = useState<Record<string, number>>({});
  const [tryoutNotes, setTryoutNotes] = useState("");
  const [selectedTryoutPlayer, setSelectedTryoutPlayer] = useState("");
  
  const { toast } = useToast();

  const fetchEvaluations = async () => {
    try {
      const { data: evalData, error } = await supabase
        .from("evaluations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      const evaluationsWithProfiles = evalData?.map(evaluation => ({
        ...evaluation,
        player_profile: profilesData?.find(p => p.id === evaluation.player_id) || { full_name: "Unknown", email: "" },
        coach_profile: profilesData?.find(p => p.id === evaluation.coach_id) || { full_name: "Unknown", email: "" }
      })) || [];

      setEvaluations(evaluationsWithProfiles as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar avaliações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvolutionEvaluations = async () => {
    try {
      const { data, error } = await supabase
        .from("evolution_evaluations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      const evolutionsWithProfiles = data?.map(evolution => ({
        ...evolution,
        player_profile: profilesData?.find(p => p.id === evolution.player_id) || { full_name: "Unknown", email: "" },
        evaluator_profile: profilesData?.find(p => p.id === evolution.evaluator_id) || { full_name: "Unknown", email: "" }
      })) || [];

      setEvolutionEvaluations(evolutionsWithProfiles);
    } catch (error: any) {
      console.error("Error loading evolution evaluations:", error);
    }
  };

  const fetchMonthlySummaries = async () => {
    try {
      const { data, error } = await supabase
        .from("monthly_evaluation_summary")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      const summariesWithProfiles = data?.map(summary => ({
        ...summary,
        player_profile: profilesData?.find(p => p.id === summary.player_id) || { full_name: "Unknown", email: "" }
      })) || [];

      setMonthlySummaries(summariesWithProfiles);
    } catch (error: any) {
      console.error("Error loading monthly summaries:", error);
    }
  };

  const fetchUsers = async () => {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("approved", true);

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const usersWithRoles = profilesData?.map(p => ({
      ...p,
      roles: rolesData?.filter(r => r.user_id === p.id).map(r => r.role) || []
    })) || [];

    const playersList = usersWithRoles.filter(p => p.roles.includes('player'));
    const coachesList = usersWithRoles.filter(p => p.roles.includes('coach'));

    setPlayers(playersList);
    setCoaches(coachesList);
    setAllUsers(usersWithRoles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("evaluations").insert({
      player_id: formData.player_id,
      coach_id: formData.coach_id,
      score: formData.score ? parseInt(formData.score) : null,
      category: formData.category,
      notes: formData.notes || null
    });

    if (error) {
      toast({
        title: "Erro ao criar avaliação",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Avaliação criada",
        description: "A avaliação foi criada com sucesso."
      });
      setOpen(false);
      setFormData({
        player_id: "",
        coach_id: "",
        score: "",
        category: "",
        notes: ""
      });
      fetchEvaluations();
    }
  };

  useEffect(() => {
    fetchEvaluations();
    fetchUsers();
    fetchEvolutionEvaluations();
    fetchMonthlySummaries();
    loadEvolutionCategories();
    loadTryoutEvaluations();
  }, []);

  const loadEvolutionCategories = async () => {
    const { data, error } = await supabase
      .from("evolution_categories")
      .select("*")
      .order("name");

    if (!error && data) {
      setEvolutionCategories(data);
      // Initialize scores objects
      const initialScores: Record<string, number> = {};
      data.forEach(cat => initialScores[cat.id] = 5);
      setEvolutionScores(initialScores);
      setTryoutScores(initialScores);
    }
  };

  const loadTryoutEvaluations = async () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const { data, error } = await supabase
      .from("evolution_evaluations")
      .select("*")
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading tryout evaluations:", error);
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    const tryoutsWithProfiles = data?.map(tryout => ({
      ...tryout,
      player_profile: profilesData?.find(p => p.id === tryout.player_id) || { full_name: "Unknown", email: "" },
      evaluator_profile: profilesData?.find(p => p.id === tryout.evaluator_id) || { full_name: "Unknown", email: "" }
    })) || [];

    setTryoutEvaluations(tryoutsWithProfiles);
  };

  const handleCreateEvolutionEvaluation = async () => {
    if (!selectedEvolutionPlayer) {
      toast({
        title: "Erro",
        description: "Selecione um jogador",
        variant: "destructive"
      });
      return;
    }

    const allScored = evolutionCategories.every(cat => evolutionScores[cat.id] > 0);
    if (!allScored) {
      toast({
        title: "Erro",
        description: "Avalie todas as categorias",
        variant: "destructive"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

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
      toast({
        title: "Erro ao criar avaliação de evolução",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Avaliação de evolução criada",
      description: "A avaliação foi criada com sucesso."
    });
    
    setShowEvolutionDialog(false);
    setSelectedEvolutionPlayer("");
    setEvolutionNotes("");
    const resetScores: Record<string, number> = {};
    evolutionCategories.forEach(cat => resetScores[cat.id] = 5);
    setEvolutionScores(resetScores);
    fetchEvolutionEvaluations();
  };

  const handleCreateTryoutEvaluation = async () => {
    if (!selectedTryoutPlayer) {
      toast({
        title: "Erro",
        description: "Selecione um jogador",
        variant: "destructive"
      });
      return;
    }

    const allScored = evolutionCategories.every(cat => tryoutScores[cat.id] > 0);
    if (!allScored) {
      toast({
        title: "Erro",
        description: "Avalie todas as categorias",
        variant: "destructive"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const scores = Object.values(tryoutScores);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    const { error } = await supabase
      .from("evolution_evaluations")
      .insert({
        evaluator_id: user.id,
        player_id: selectedTryoutPlayer,
        month: currentMonth,
        year: currentYear,
        category_scores: tryoutScores,
        average_score: average,
        notes: tryoutNotes || null
      });

    if (error) {
      toast({
        title: "Erro ao criar avaliação tryout",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Avaliação tryout criada",
      description: "A avaliação foi criada com sucesso."
    });
    
    setShowTryoutDialog(false);
    setSelectedTryoutPlayer("");
    setTryoutNotes("");
    const resetScores: Record<string, number> = {};
    evolutionCategories.forEach(cat => resetScores[cat.id] = 5);
    setTryoutScores(resetScores);
    loadTryoutEvaluations();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getFilteredEvaluations = () => {
    let filtered = evaluations;

    if (filterRole !== "all") {
      const usersWithRole = allUsers.filter(u => u.roles.includes(filterRole)).map(u => u.id);
      filtered = filtered.filter(e => usersWithRole.includes(e.player_id));
    }

    if (filterUser !== "all") {
      filtered = filtered.filter(e => e.player_id === filterUser || e.coach_id === filterUser);
    }

    return filtered;
  };

  if (loading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground">Visualizar e gerenciar avaliações dos players</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Avaliação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Avaliação</DialogTitle>
              <DialogDescription>Adicione uma nova avaliação de player</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="player_id">Player</Label>
                <Select value={formData.player_id} onValueChange={(value) => setFormData({ ...formData, player_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name} ({player.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="coach_id">Coach</Label>
                <Select value={formData.coach_id} onValueChange={(value) => setFormData({ ...formData, coach_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um coach" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map(coach => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.full_name} ({coach.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                <Label htmlFor="score">Nota (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Criar Avaliação</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Avaliações Gerais</TabsTrigger>
          <TabsTrigger value="evolution">Avaliações de Evolução</TabsTrigger>
          <TabsTrigger value="tryout">Tryout</TabsTrigger>
          <TabsTrigger value="monthly">Médias Mensais</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Avaliações</CardTitle>
              <CardDescription>Total: {getFilteredEvaluations().length} avaliações</CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Label>Filtrar por Role</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="player">Players</SelectItem>
                      <SelectItem value="coach">Coaches</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Filtrar por Usuário</Label>
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {allUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.roles.join(', ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {getFilteredEvaluations().length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma avaliação encontrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Avaliado</TableHead>
                      <TableHead>Avaliador</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredEvaluations().map(evaluation => (
                      <TableRow key={evaluation.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{evaluation.player_profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{evaluation.player_profile.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{evaluation.coach_profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{evaluation.coach_profile.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{evaluation.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-2xl font-bold ${getScoreColor(evaluation.score)}`}>
                            {evaluation.score}
                          </span>
                        </TableCell>
                        <TableCell>{format(new Date(evaluation.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="space-y-1">
                            {evaluation.notes && (
                              <p className="text-sm"><strong>Avaliador:</strong> {evaluation.notes}</p>
                            )}
                            {evaluation.admin_notes && (
                              <p className="text-sm text-muted-foreground">
                                <strong>Admin:</strong> {evaluation.admin_notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Avaliações de Evolução</CardTitle>
                <CardDescription>Total: {evolutionEvaluations.length} avaliações de evolução</CardDescription>
              </div>
              <Button onClick={() => setShowEvolutionDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Avaliação de Evolução
              </Button>
            </CardHeader>
            <CardContent>
              {evolutionEvaluations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma avaliação de evolução cadastrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Avaliador</TableHead>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Média</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evolutionEvaluations.map(evolution => (
                      <TableRow key={evolution.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{evolution.player_profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{evolution.player_profile.email}</p>
                          </div>
                        </TableCell>
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
                        <TableCell>{format(new Date(evolution.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="max-w-xs">
                          {evolution.notes && (
                            <p className="text-sm">{evolution.notes}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tryout">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Avaliações Tryout</CardTitle>
                <CardDescription>Total: {tryoutEvaluations.length} avaliações tryout</CardDescription>
              </div>
              <Button onClick={() => setShowTryoutDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Avaliação Tryout
              </Button>
            </CardHeader>
            <CardContent>
              {tryoutEvaluations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma avaliação tryout cadastrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Avaliador</TableHead>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Média</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tryoutEvaluations.map(tryout => (
                      <TableRow key={tryout.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tryout.player_profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{tryout.player_profile.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tryout.evaluator_profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{tryout.evaluator_profile.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(tryout.year, tryout.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <span className={`text-2xl font-bold ${getScoreColor(tryout.average_score || 0)}`}>
                            {tryout.average_score ? tryout.average_score.toFixed(1) : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>{format(new Date(tryout.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="max-w-xs">
                          {tryout.notes && <p className="text-sm">{tryout.notes}</p>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Médias Mensais</CardTitle>
              <CardDescription>Total: {monthlySummaries.length} médias mensais</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlySummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma média mensal calculada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Média</TableHead>
                      <TableHead>Total de Avaliações</TableHead>
                      <TableHead>Última Atualização</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySummaries.map(summary => (
                      <TableRow key={summary.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{summary.player_profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{summary.player_profile.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(summary.year, summary.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <span className={`text-2xl font-bold ${getScoreColor(summary.average_score || 0)}`}>
                            {summary.average_score ? summary.average_score.toFixed(1) : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{summary.total_evaluations}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(summary.updated_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Evolution Dialog */}
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
                  {players.filter(p => p.roles.includes('player')).length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Nenhum jogador cadastrado
                    </div>
                  ) : (
                    players.filter(p => p.roles.includes('player')).map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name} ({player.email})
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

      {/* Tryout Dialog */}
      <Dialog open={showTryoutDialog} onOpenChange={setShowTryoutDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Avaliação Tryout</DialogTitle>
            <DialogDescription>Avalie o candidato em múltiplas categorias</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tryout-player">Candidato *</Label>
              <Select value={selectedTryoutPlayer} onValueChange={setSelectedTryoutPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um candidato" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {players.filter(p => p.roles.includes('player')).length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Nenhum candidato cadastrado
                    </div>
                  ) : (
                    players.filter(p => p.roles.includes('player')).map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name} ({player.email})
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
                      {tryoutScores[category.id] || 5}/10
                    </Badge>
                  </div>
                  <Input
                    type="range"
                    min="1"
                    max="10"
                    value={tryoutScores[category.id] || 5}
                    onChange={(e) => setTryoutScores({
                      ...tryoutScores,
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
                      {(Object.values(tryoutScores).reduce((a, b) => a + b, 0) / evolutionCategories.length).toFixed(1)}/10
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="tryout-notes">Observações Gerais</Label>
              <Textarea
                id="tryout-notes"
                value={tryoutNotes}
                onChange={(e) => setTryoutNotes(e.target.value)}
                rows={4}
                placeholder="Comentários sobre a avaliação do candidato..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTryoutDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTryoutEvaluation}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
