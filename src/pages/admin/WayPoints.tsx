import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trophy, Plus, TrendingUp, Award, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Category {
  id: string;
  name: string;
  description: string | null;
  points_value: number;
  created_at: string;
}

interface Assignment {
  id: string;
  player_id: string;
  category_id: string;
  quantity: number;
  total_points: number;
  month: number;
  year: number;
  notes: string | null;
  created_at: string;
  player: {
    full_name: string;
  };
  category: {
    name: string;
    points_value: number;
  };
}

interface RankingEntry {
  player_id: string;
  player_name: string;
  total_points: number;
  assignments_count: number;
  participation_days: number;
  score: number;
  is_new_player: boolean;
}

interface PeriodSettings {
  id: string;
  period_start_date: string;
  period_number: number;
  duration_months: number;
  created_at: string;
}

export default function WayPoints() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [players, setPlayers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newContestDialogOpen, setNewContestDialogOpen] = useState(false);
  const [newContestDuration, setNewContestDuration] = useState("4");

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Category form
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryPoints, setCategoryPoints] = useState("");

  // Assignment form
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [assignmentNotes, setAssignmentNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadPeriodSettings(),
      loadCategories(),
      loadPlayers()
    ]);
    // Load assignments and ranking after we have period settings
    await loadAssignments();
    await loadRanking();
    setLoading(false);
  };

  const loadPeriodSettings = async () => {
    const { data, error } = await supabase
      .from("way_points_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast.error("Erro ao carregar configurações do período");
      console.error(error);
      return;
    }

    if (!data) {
      // Create initial period if none exists
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newPeriod, error: insertError } = await supabase
        .from("way_points_settings")
        .insert({
          period_start_date: new Date().toISOString(),
          period_number: 1,
          duration_months: 4,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) {
        toast.error("Erro ao criar período inicial");
        console.error(insertError);
        return;
      }

      setPeriodSettings(newPeriod);
    } else {
      setPeriodSettings(data);
    }
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("way_point_categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar categorias");
      console.error(error);
      return;
    }

    setCategories(data || []);
  };

  const loadAssignments = async () => {
    if (!periodSettings) return;

    const { data, error } = await supabase
      .from("way_point_assignments")
      .select(`
        *,
        player:player_id(full_name),
        category:category_id(name, points_value)
      `)
      .eq("period_number", periodSettings.period_number)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar atribuições");
      console.error(error);
      return;
    }

    setAssignments(data as any || []);
  };

  const loadRanking = async () => {
    if (!periodSettings) return;

    const { data, error } = await supabase
      .from("way_point_assignments")
      .select(`
        player_id,
        total_points,
        profiles:player_id(full_name, created_at)
      `)
      .eq("period_number", periodSettings.period_number);

    if (error) {
      toast.error("Erro ao carregar ranking");
      console.error(error);
      return;
    }

    // Aggregate points by player
    const playerPoints = new Map<string, { name: string; points: number; count: number; created_at: string }>();
    
    data?.forEach((assignment: any) => {
      const existing = playerPoints.get(assignment.player_id);
      if (existing) {
        existing.points += assignment.total_points;
        existing.count += 1;
      } else {
        playerPoints.set(assignment.player_id, {
          name: assignment.profiles?.full_name || "Desconhecido",
          points: assignment.total_points,
          count: 1,
          created_at: assignment.profiles?.created_at
        });
      }
    });

    const periodStartDate = new Date(periodSettings.period_start_date);
    const now = new Date();
    
    const rankingData: RankingEntry[] = Array.from(playerPoints.entries())
      .map(([player_id, data]) => {
        const userCreatedDate = new Date(data.created_at);
        const isNewPlayer = userCreatedDate > periodStartDate;
        
        if (isNewPlayer) {
          // New player - use formula: 100 × participation_days / total_points
          const participationDays = Math.max(1, Math.ceil((now.getTime() - userCreatedDate.getTime()) / (1000 * 60 * 60 * 24)));
          const score = data.points > 0 ? (100 * participationDays) / data.points : 0;
          
          return {
            player_id,
            player_name: data.name,
            total_points: data.points,
            assignments_count: data.count,
            participation_days: participationDays,
            score: parseFloat(score.toFixed(2)),
            is_new_player: true
          };
        } else {
          // Original player - rank by total points
          return {
            player_id,
            player_name: data.name,
            total_points: data.points,
            assignments_count: data.count,
            participation_days: Math.ceil((now.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)),
            score: data.points, // Score equals total points for fairness
            is_new_player: false
          };
        }
      })
      .sort((a, b) => b.score - a.score); // Sort by score (higher is better)

    setRanking(rankingData);
  };

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");

    if (error) {
      toast.error("Erro ao carregar players");
      console.error(error);
      return;
    }

    setPlayers(data || []);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const points = parseInt(categoryPoints);
    if (isNaN(points)) {
      toast.error("Valor de pontos inválido");
      return;
    }

    const { error } = await supabase
      .from("way_point_categories")
      .insert({
        name: categoryName,
        description: categoryDescription || null,
        points_value: points,
        created_by: user.id
      });

    if (error) {
      toast.error("Erro ao criar categoria");
      console.error(error);
      return;
    }

    toast.success("Categoria criada com sucesso!");
    setCategoryDialogOpen(false);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryPoints("");
    loadCategories();
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory) return;

    const points = parseInt(categoryPoints);
    if (isNaN(points)) {
      toast.error("Valor de pontos inválido");
      return;
    }

    const { error } = await supabase
      .from("way_point_categories")
      .update({
        name: categoryName,
        description: categoryDescription || null,
        points_value: points,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedCategory.id);

    if (error) {
      toast.error("Erro ao editar categoria");
      console.error(error);
      return;
    }

    toast.success("Categoria editada com sucesso!");
    setEditCategoryDialogOpen(false);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryPoints("");
    setSelectedCategory(null);
    loadCategories();
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    const { error } = await supabase
      .from("way_point_categories")
      .delete()
      .eq("id", selectedCategory.id);

    if (error) {
      toast.error("Erro ao deletar categoria");
      console.error(error);
      return;
    }

    toast.success("Categoria deletada com sucesso!");
    setDeleteAlertOpen(false);
    setSelectedCategory(null);
    loadCategories();
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setCategoryPoints(category.points_value.toString());
    setEditCategoryDialogOpen(true);
  };

  const openDeleteAlert = (category: Category) => {
    setSelectedCategory(category);
    setDeleteAlertOpen(true);
  };

  const handleAssignPoints = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!selectedPlayerId || !selectedCategoryId) {
      toast.error("Selecione um player e uma categoria");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      toast.error("Quantidade inválida");
      return;
    }

    const category = categories.find(c => c.id === selectedCategoryId);
    if (!category) return;

    const totalPoints = qty * category.points_value;

    const { error } = await supabase
      .from("way_point_assignments")
      .insert({
        player_id: selectedPlayerId,
        category_id: selectedCategoryId,
        quantity: qty,
        total_points: totalPoints,
        assigned_by: user.id,
        month: currentMonth,
        year: currentYear,
        period_number: periodSettings?.period_number || 1,
        notes: assignmentNotes || null
      });

    if (error) {
      toast.error("Erro ao atribuir pontos");
      console.error(error);
      return;
    }

    toast.success(`${totalPoints} pontos atribuídos com sucesso!`);
    setAssignDialogOpen(false);
    setSelectedPlayerId("");
    setSelectedCategoryId("");
    setQuantity("1");
    setAssignmentNotes("");
    loadAssignments();
    loadRanking();
  };

  const handleResetPeriod = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!periodSettings) return;

      const { data: newPeriod, error } = await supabase
        .from("way_points_settings")
        .insert({
          period_start_date: new Date().toISOString(),
          period_number: periodSettings.period_number + 1,
          duration_months: periodSettings.duration_months,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao resetar período");
        console.error(error);
        return;
      }

      toast.success(`Novo período iniciado! Período #${newPeriod.period_number}`);
      setResetDialogOpen(false);
      setPeriodSettings(newPeriod);
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao resetar período");
      console.error(error);
    }
  };

  const handleCreateNewContest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!periodSettings) return;

      const duration = parseInt(newContestDuration);
      if (isNaN(duration) || duration < 1) {
        toast.error("Duração inválida");
        return;
      }

      const { data: newPeriod, error } = await supabase
        .from("way_points_settings")
        .insert({
          period_start_date: new Date().toISOString(),
          period_number: periodSettings.period_number + 1,
          duration_months: duration,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar novo concurso");
        console.error(error);
        return;
      }

      toast.success(`Novo concurso iniciado! Período #${newPeriod.period_number} - ${duration} meses`);
      setNewContestDialogOpen(false);
      setNewContestDuration("4");
      setPeriodSettings(newPeriod);
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao criar novo concurso");
      console.error(error);
    }
  };

  const getRankingBadgeColor = (position: number) => {
    if (position === 0) return "bg-yellow-500 text-white";
    if (position === 1) return "bg-gray-400 text-white";
    if (position === 2) return "bg-orange-600 text-white";
    return "bg-muted text-muted-foreground";
  };

  const getPeriodDateRange = () => {
    if (!periodSettings) return "";
    const start = new Date(periodSettings.period_start_date);
    const end = new Date(start);
    end.setMonth(end.getMonth() + periodSettings.duration_months);
    
    return `${start.toLocaleDateString("pt-BR")} - ${end.toLocaleDateString("pt-BR")} (${periodSettings.duration_months} meses)`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando Way Points...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Way Points
            </h1>
            <p className="text-muted-foreground">
              Período #{periodSettings?.period_number} - {getPeriodDateRange()}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={newContestDialogOpen} onOpenChange={setNewContestDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Concurso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Concurso Way Points</DialogTitle>
                  <DialogDescription>
                    Defina a duração do novo concurso. O período anterior será mantido no histórico.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateNewContest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração (meses)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="12"
                      value={newContestDuration}
                      onChange={(e) => setNewContestDuration(e.target.value)}
                      placeholder="Ex: 4"
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Será criado o Período #{(periodSettings?.period_number || 0) + 1}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setNewContestDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Criar Concurso
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="destructive" 
              onClick={() => setResetDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Resetar Período
            </Button>
          </div>
        </div>

        <Tabs defaultValue="ranking" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ranking">
              <Award className="h-4 w-4 mr-2" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="assign">Atribuir Pontos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle>Ranking do Período</CardTitle>
                <CardDescription>
                  Top performers do Período #{periodSettings?.period_number} • Novos jogadores: Score = 100 × dias / pontos | Jogadores originais: Total de pontos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ranking.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum ponto atribuído este mês
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ranking.map((entry, index) => (
                      <div
                        key={entry.player_id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <Badge className={getRankingBadgeColor(index)}>
                            #{index + 1}
                          </Badge>
                          <div>
                            <p className="font-semibold">{entry.player_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {entry.assignments_count} atribuições • {entry.participation_days} dias
                              {entry.is_new_player && <Badge variant="secondary" className="ml-2 text-xs">Novo</Badge>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {entry.score}
                            </p>
                            <p className="text-xs text-muted-foreground">score</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">
                              {entry.total_points}
                            </p>
                            <p className="text-xs text-muted-foreground">pontos</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Categorias de Pontos</CardTitle>
                    <CardDescription>
                      Gerencie as categorias de pontuação
                    </CardDescription>
                  </div>
                  <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Categoria
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Nova Categoria</DialogTitle>
                        <DialogDescription>
                          Defina uma nova categoria de pontuação
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateCategory} className="space-y-4">
                        <div>
                          <Label htmlFor="category-name">Nome da Categoria</Label>
                          <Input
                            id="category-name"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="Ex: Melhor Jogador"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="category-description">Descrição</Label>
                          <Textarea
                            id="category-description"
                            value={categoryDescription}
                            onChange={(e) => setCategoryDescription(e.target.value)}
                            placeholder="Descreva quando esta categoria deve ser aplicada"
                          />
                        </div>
                        <div>
                          <Label htmlFor="category-points">Valor de Pontos</Label>
                          <Input
                            id="category-points"
                            type="number"
                            value={categoryPoints}
                            onChange={(e) => setCategoryPoints(e.target.value)}
                            placeholder="Ex: 15 ou -5"
                            required
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Use valores positivos para recompensas e negativos para penalidades
                          </p>
                        </div>
                        <Button type="submit" className="w-full">
                          Criar Categoria
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma categoria cadastrada
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Pontos</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {category.description || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={category.points_value >= 0 ? "default" : "destructive"}>
                              {category.points_value >= 0 ? "+" : ""}
                              {category.points_value}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(category)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteAlert(category)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Dialog open={editCategoryDialogOpen} onOpenChange={setEditCategoryDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Categoria</DialogTitle>
                  <DialogDescription>
                    Modifique os dados da categoria de pontuação
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditCategory} className="space-y-4">
                  <div>
                    <Label htmlFor="edit-category-name">Nome da Categoria</Label>
                    <Input
                      id="edit-category-name"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Ex: Melhor Jogador"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category-description">Descrição</Label>
                    <Textarea
                      id="edit-category-description"
                      value={categoryDescription}
                      onChange={(e) => setCategoryDescription(e.target.value)}
                      placeholder="Descreva quando esta categoria deve ser aplicada"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category-points">Valor de Pontos</Label>
                    <Input
                      id="edit-category-points"
                      type="number"
                      value={categoryPoints}
                      onChange={(e) => setCategoryPoints(e.target.value)}
                      placeholder="Ex: 15 ou -5"
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Use valores positivos para recompensas e negativos para penalidades
                    </p>
                  </div>
                  <Button type="submit" className="w-full">
                    Salvar Alterações
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deletar Categoria</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja deletar a categoria "{selectedCategory?.name}"? 
                    Esta ação não pode ser desfeita e todas as atribuições relacionadas serão removidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="assign">
            <Card>
              <CardHeader>
                <CardTitle>Atribuir Pontos</CardTitle>
                <CardDescription>
                  Adicione pontos a um player baseado em uma categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAssignPoints} className="space-y-4">
                  <div>
                    <Label htmlFor="player-select">Player</Label>
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger id="player-select">
                        <SelectValue placeholder="Selecione um player" />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category-select">Categoria</Label>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger id="category-select">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name} ({category.points_value >= 0 ? "+" : ""}
                            {category.points_value} pts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Quantas vezes o player recebeu esta categoria
                    </p>
                  </div>
                  {selectedCategoryId && quantity && (
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm font-medium">Total de pontos:</p>
                      <p className="text-2xl font-bold text-primary">
                        {parseInt(quantity) * 
                          (categories.find(c => c.id === selectedCategoryId)?.points_value || 0)}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="assignment-notes">Notas (opcional)</Label>
                    <Textarea
                      id="assignment-notes"
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      placeholder="Adicione observações sobre esta atribuição"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Atribuir Pontos
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Atribuições</CardTitle>
                <CardDescription>
                  Todas as atribuições de pontos do Período #{periodSettings?.period_number}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma atribuição este mês
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                        <TableHead className="text-right">Pontos</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {assignment.player.full_name}
                          </TableCell>
                          <TableCell>{assignment.category.name}</TableCell>
                          <TableCell className="text-center">{assignment.quantity}x</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={assignment.total_points >= 0 ? "default" : "destructive"}>
                              {assignment.total_points >= 0 ? "+" : ""}
                              {assignment.total_points}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(assignment.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resetar Período do Way Points</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja iniciar um novo período? Esta ação irá:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Manter todos os dados históricos do período atual</li>
                  <li>Iniciar um novo período com a mesma duração ({periodSettings?.duration_months} meses - Período #{(periodSettings?.period_number || 0) + 1})</li>
                  <li>Zerar o ranking para novas atribuições</li>
                </ul>
                <p className="mt-4 font-semibold">
                  O vencedor do período atual deve ser premiado antes de resetar!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleResetPeriod}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}