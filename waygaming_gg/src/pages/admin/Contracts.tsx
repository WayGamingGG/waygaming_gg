import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Contract {
  id: string;
  player_id: string;
  start_date: string;
  end_date: string;
  salary: number;
  status: string;
  notes: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function AdminContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    player_id: "",
    start_date: "",
    end_date: "",
    salary: "",
    status: "active",
    notes: ""
  });
  const { toast } = useToast();

  const fetchContracts = async () => {
    try {
      const { data: contractsData, error } = await supabase
        .from("contracts")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      const contractsWithProfiles = contractsData?.map(contract => ({
        ...contract,
        profiles: profilesData?.find(p => p.id === contract.player_id) || { full_name: "Unknown", email: "" }
      })) || [];

      setContracts(contractsWithProfiles as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar contratos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("approved", true);
    setPlayers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("contracts").insert({
      player_id: formData.player_id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      salary: formData.salary ? parseFloat(formData.salary) : null,
      status: formData.status,
      notes: formData.notes || null,
      created_by: user.id
    });

    if (error) {
      toast({
        title: "Erro ao criar contrato",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Contrato criado",
        description: "O contrato foi criado com sucesso."
      });
      setOpen(false);
      setFormData({
        player_id: "",
        start_date: "",
        end_date: "",
        salary: "",
        status: "active",
        notes: ""
      });
      fetchContracts();
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchPlayers();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">Gerenciar contratos dos players</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Contrato</DialogTitle>
              <DialogDescription>Adicione um novo contrato para um player</DialogDescription>
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
                <Label htmlFor="start_date">Data de Início</Label>
                <Input
                  id="start_date"
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">Data de Término</Label>
                <Input
                  id="end_date"
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="salary">Salário (R$)</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Criar Contrato</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contratos Cadastrados</CardTitle>
          <CardDescription>Total: {contracts.length} contratos</CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum contrato cadastrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Salário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(contract => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contract.profiles.full_name}</p>
                        <p className="text-xs text-muted-foreground">{contract.profiles.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(contract.start_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{format(new Date(contract.end_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      {contract.salary ? `R$ ${contract.salary.toLocaleString("pt-BR")}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={contract.status === "active" ? "default" : "secondary"}>
                        {contract.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{contract.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
