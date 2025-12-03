import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  approved: boolean;
  created_at: string;
  roles: string[];
}

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "" });
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "player" });
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, approved, created_at");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || []
      })) || [];

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      // Validação dos campos obrigatórios
      if (!newUser.email || !newUser.email.trim()) {
        toast({
          title: "Erro de validação",
          description: "O email é obrigatório.",
          variant: "destructive"
        });
        return;
      }

      if (!newUser.password || newUser.password.length < 6) {
        toast({
          title: "Erro de validação",
          description: "A senha deve ter no mínimo 6 caracteres.",
          variant: "destructive"
        });
        return;
      }

      if (!newUser.full_name || !newUser.full_name.trim()) {
        toast({
          title: "Erro de validação",
          description: "O nome completo é obrigatório.",
          variant: "destructive"
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUser.email.trim(),
          password: newUser.password,
          full_name: newUser.full_name.trim(),
          role: newUser.role
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      toast({
        title: "Usuário criado com sucesso",
        description: `${newUser.email} foi adicionado ao sistema.`
      });

      setShowCreateDialog(false);
      setNewUser({ email: "", password: "", full_name: "", role: "player" });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleApproveUser = async (userId: string, email: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Não autenticado");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ 
          approved: true, 
          approved_at: new Date().toISOString(),
          approved_by: user.id 
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Usuário aprovado",
        description: `${email} foi aprovado no sistema.`
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário ${email}?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao deletar usuário');
      }

      toast({
        title: "Usuário deletado",
        description: `${email} foi removido do sistema.`
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao deletar usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleOpenEditDialog = (user: Profile) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || "",
      role: user.roles[0] || "player"
    });
    setShowEditDialog(true);
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: editForm.full_name.trim() })
        .eq("id", editingUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      const currentRole = editingUser.roles[0];
      if (editForm.role !== currentRole) {
        // Delete existing role
        if (currentRole) {
          await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", editingUser.id);
        }

        // Insert new role
        const { data: { user } } = await supabase.auth.getUser();
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: editingUser.id,
            role: editForm.role as "admin" | "coach" | "player",
            created_by: user?.id
          });

        if (roleError) throw roleError;
      }

      toast({
        title: "Usuário atualizado",
        description: `${editingUser.email} foi atualizado com sucesso.`
      });

      setShowEditDialog(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao editar usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">Criar, editar e remover usuários do sistema</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>Total: {users.length} usuários</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Data Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name || "-"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.approved ? (
                      <Badge variant="default">Aprovado</Badge>
                    ) : (
                      <Badge variant="outline">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.roles.length > 0 ? (
                        user.roles.map(role => (
                          <Badge key={role} variant="secondary">{role}</Badge>
                        ))
                      ) : (
                        <Badge variant="outline">Sem role</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {!user.approved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApproveUser(user.id, user.email)}
                          title="Aprovar usuário"
                        >
                          ✓
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(user)}
                        title="Editar usuário"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        title="Deletar usuário"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha * (mínimo 6 caracteres)</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser}>Criar Usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Editar dados de {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_full_name">Nome Completo</Label>
              <Input
                id="edit_full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_role">Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditUser}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
