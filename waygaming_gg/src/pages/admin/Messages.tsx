import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Mail, MailOpen, Plus, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  read: boolean;
  created_at: string;
  parent_message_id: string | null;
  sender_profile: {
    full_name: string;
    email: string;
  };
  recipient_profile: {
    full_name: string;
    email: string;
  };
  replies?: Message[];
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [formData, setFormData] = useState({
    recipient_id: "",
    subject: "",
    content: ""
  });
  const [replyContent, setReplyContent] = useState("");
  const { toast } = useToast();

  const fetchMessages = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      // Group messages by thread (parent messages and their replies)
      const messageMap = new Map<string, Message>();
      const rootMessages: Message[] = [];

      messagesData?.forEach(message => {
        const messageWithProfiles = {
          ...message,
          sender_profile: profilesData?.find(p => p.id === message.sender_id) || { full_name: "Unknown", email: "" },
          recipient_profile: profilesData?.find(p => p.id === message.recipient_id) || { full_name: "Unknown", email: "" },
          replies: []
        };
        messageMap.set(message.id, messageWithProfiles);
      });

      // Build thread structure
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

      // Sort replies by date
      rootMessages.forEach(msg => {
        if (msg.replies) {
          msg.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
      });

      setMessages(rootMessages);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar mensagens",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("approved", true);
    setUsers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: formData.recipient_id,
      subject: formData.subject,
      content: formData.content
    });

    if (error) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Mensagem enviada",
        description: "A mensagem foi enviada com sucesso."
      });
      setOpen(false);
      setFormData({
        recipient_id: "",
        subject: "",
        content: ""
      });
      fetchMessages();
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMessage || !replyContent.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Reply goes to the original sender
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
      fetchMessages();
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mensagens do Sistema</h1>
          <p className="text-muted-foreground">Visualizar todas as mensagens trocadas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Mensagem</DialogTitle>
              <DialogDescription>Envie uma mensagem para um usuário</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="recipient_id">Destinatário</Label>
                <Select value={formData.recipient_id} onValueChange={(value) => setFormData({ ...formData, recipient_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um destinatário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="content">Mensagem</Label>
                <Textarea
                  id="content"
                  required
                  rows={5}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Enviar Mensagem</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Mensagens</CardTitle>
          <CardDescription>Total: {messages.length} mensagens</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma mensagem no sistema
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {message.read ? (
                        <MailOpen className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Mail className="h-4 w-4 text-primary" />
                      )}
                      <h3 className="font-semibold">{message.subject}</h3>
                      {!message.read && <Badge variant="default">Nova</Badge>}
                      {message.replies && message.replies.length > 0 && (
                        <Badge variant="outline">{message.replies.length} {message.replies.length === 1 ? 'resposta' : 'respostas'}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <span className="text-muted-foreground">De: </span>
                      <span className="font-medium">{message.sender_profile.full_name}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({message.sender_profile.email})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Para: </span>
                      <span className="font-medium">{message.recipient_profile.full_name}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({message.recipient_profile.email})
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{message.content}</p>
                  
                  {/* Replies thread */}
                  {message.replies && message.replies.length > 0 && (
                    <div className="mt-4 pl-4 border-l-2 border-primary/20 space-y-3">
                      {message.replies.map(reply => (
                        <div key={reply.id} className="bg-muted/30 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{reply.sender_profile.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(reply.created_at), "dd/MM/yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedMessage(message);
                        setReplyOpen(true);
                      }}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Responder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
