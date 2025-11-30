import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Calendar as CalendarIcon, Plus, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Event = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_mandatory: boolean;
  created_by: string;
};

type EventResponse = {
  id: string;
  event_id: string;
  status: "accepted" | "declined" | "pending";
  notes: string | null;
};

export const Calendar = () => {
  const { toast } = useToast();
  const { isAdmin, isCoach, isPlayer } = useUserRole();
  const [events, setEvents] = useState<Event[]>([]);
  const [responses, setResponses] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    is_mandatory: false,
  });

  useEffect(() => {
    loadEvents();
    loadResponses();
  }, []);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Error loading events:", error);
      return;
    }

    setEvents(data || []);
  };

  const loadResponses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("event_responses")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error loading responses:", error);
      return;
    }

    setResponses((data || []) as EventResponse[]);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.start_date || !newEvent.end_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("events").insert({
      ...newEvent,
      created_by: user.id,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar evento",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Evento criado com sucesso",
    });

    setDialogOpen(false);
    setNewEvent({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      is_mandatory: false,
    });
    loadEvents();
  };

  const handleRespondToEvent = async (
    eventId: string,
    status: "accepted" | "declined",
    notes?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existingResponse = responses.find((r) => r.event_id === eventId);

    if (existingResponse) {
      const { error } = await supabase
        .from("event_responses")
        .update({ status, notes: notes || existingResponse.notes })
        .eq("id", existingResponse.id);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar resposta",
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase.from("event_responses").insert({
        event_id: eventId,
        user_id: user.id,
        status,
        notes: notes || null,
      });

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao responder evento",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Sucesso",
      description: `Evento ${status === "accepted" ? "aceito" : "recusado"}`,
    });
    loadResponses();
  };

  const handleUpdateNotes = async (eventId: string, notes: string) => {
    const response = responses.find((r) => r.event_id === eventId);
    if (!response) return;

    const { error } = await supabase
      .from("event_responses")
      .update({ notes })
      .eq("id", response.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar notas",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Notas atualizadas",
    });
    loadResponses();
  };

  const getResponseForEvent = (eventId: string) => {
    return responses.find((r) => r.event_id === eventId);
  };

  return (
    <Card className="glass-card p-3 sm:p-6 border-primary/30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold">Calendário de Eventos</h2>
        </div>
        {(isAdmin || isCoach) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Data de Início *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={newEvent.start_date}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Data de Término *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={newEvent.end_date}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, end_date: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mandatory"
                    checked={newEvent.is_mandatory}
                    onCheckedChange={(checked) =>
                      setNewEvent({ ...newEvent, is_mandatory: checked })
                    }
                  />
                  <Label htmlFor="mandatory">Evento Obrigatório</Label>
                </div>
                <Button
                  onClick={handleCreateEvent}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Criando..." : "Criar Evento"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum evento cadastrado
          </p>
        ) : (
          events.map((event) => {
            const response = getResponseForEvent(event.id);
            return (
              <Card
                key={event.id}
                className={`p-4 border ${
                  event.is_mandatory
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      {event.is_mandatory && (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/20 text-destructive">
                          Obrigatório
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.start_date), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}{" "}
                      -{" "}
                      {format(new Date(event.end_date), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  {isPlayer && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          response?.status === "accepted" ? "default" : "outline"
                        }
                        onClick={() => handleRespondToEvent(event.id, "accepted")}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          response?.status === "declined"
                            ? "destructive"
                            : "outline"
                        }
                        onClick={() => handleRespondToEvent(event.id, "declined")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {isPlayer && response && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <Label className="text-xs mb-1 block">Motivo/Observações:</Label>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Ex: Tenho compromisso familiar, Estarei viajando, etc..."
                        value={response.notes || ""}
                        onChange={(e) => {
                          const newResponses = responses.map(r => 
                            r.id === response.id ? { ...r, notes: e.target.value } : r
                          );
                          setResponses(newResponses);
                        }}
                        className="text-sm min-h-[60px]"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateNotes(event.id, response.notes || "")}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}

                {(isAdmin || isCoach) && response && (
                  <div className="text-xs mt-3">
                    <span
                      className={`px-2 py-1 rounded ${
                        response.status === "accepted"
                          ? "bg-primary/20 text-primary"
                          : response.status === "declined"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {response.status === "accepted"
                        ? "Aceito"
                        : response.status === "declined"
                        ? "Recusado"
                        : "Pendente"}
                    </span>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </Card>
  );
};
