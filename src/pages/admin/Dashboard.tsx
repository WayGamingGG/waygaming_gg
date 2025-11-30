import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, TrendingUp, ClipboardList, Award, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    approvedUsers: 0,
    pendingUsers: 0,
    totalPlayers: 0,
    totalCoaches: 0,
    totalEvaluations: 0,
    avgEvaluationScore: 0,
    evaluationsThisMonth: 0,
    upcomingEvents: 0
  });
  const [recentEvaluations, setRecentEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Approved users
      const { count: approvedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("approved", true);

      // Pending users
      const { count: pendingUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("approved", false);

      // Players count
      const { count: totalPlayers } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "player");

      // Coaches count
      const { count: totalCoaches } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "coach");

      // Total evaluations
      const { count: totalEvaluations } = await supabase
        .from("evaluations")
        .select("*", { count: "exact", head: true });

      // Average evaluation score
      const { data: evaluationsData } = await supabase
        .from("evaluations")
        .select("score");

      const avgScore = evaluationsData && evaluationsData.length > 0
        ? evaluationsData.reduce((acc, curr) => acc + (curr.score || 0), 0) / evaluationsData.length
        : 0;

      // Evaluations this month
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      const { count: evaluationsThisMonth } = await supabase
        .from("evaluations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", firstDayOfMonth.toISOString());

      // Upcoming events
      const { count: upcomingEvents } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("start_date", new Date().toISOString());

      // Recent evaluations with profiles
      const { data: recentEvals } = await supabase
        .from("evaluations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      const evalsWithProfiles = recentEvals?.map(evaluation => ({
        ...evaluation,
        player_profile: profilesData?.find(p => p.id === evaluation.player_id) || { full_name: "Unknown", email: "" },
        coach_profile: profilesData?.find(p => p.id === evaluation.coach_id) || { full_name: "Unknown", email: "" }
      })) || [];

      setStats({
        totalUsers: totalUsers || 0,
        approvedUsers: approvedUsers || 0,
        pendingUsers: pendingUsers || 0,
        totalPlayers: totalPlayers || 0,
        totalCoaches: totalCoaches || 0,
        totalEvaluations: totalEvaluations || 0,
        avgEvaluationScore: Math.round(avgScore * 10) / 10,
        evaluationsThisMonth: evaluationsThisMonth || 0,
        upcomingEvents: upcomingEvents || 0
      });

      setRecentEvaluations(evalsWithProfiles);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard do Staff</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Visão geral do sistema e métricas principais
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários registrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{stats.approvedUsers} aprovados</Badge>
              <Badge variant="outline">{stats.pendingUsers} pendentes</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Players Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlayers}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.totalCoaches} coaches registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{stats.evaluationsThisMonth} este mês</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgEvaluationScore.toFixed(1)}/10</div>
            <p className="text-xs text-muted-foreground mt-2">
              Média de todas as avaliações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Futuros</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Eventos agendados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers > 0 ? Math.round((stats.approvedUsers / stats.totalUsers) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Usuários aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliações/Player</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalPlayers > 0 ? Math.round((stats.totalEvaluations / stats.totalPlayers) * 10) / 10 : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Média por jogador
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliações Recentes</CardTitle>
          <CardDescription>Últimas 5 avaliações realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma avaliação encontrada
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvaluations.map(evaluation => (
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
                      <Badge variant="secondary">{evaluation.score}/10</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(evaluation.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}