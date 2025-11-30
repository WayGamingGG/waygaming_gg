import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, X, CalendarIcon } from "lucide-react";

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

export const MonthlyCalendar = () => {
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [responses, setResponses] = useState<EventResponse[]>([]);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEventResponse, setSelectedEventResponse] = useState<EventResponse | null>(null);
  const [responseNotes, setResponseNotes] = useState("");

  useEffect(() => {
    loadEvents();
    loadResponses();
  }, [date]);

  const loadEvents = async () => {
    if (!date) return;

    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("start_date", monthStart.toISOString())
      .lte("start_date", monthEnd.toISOString())
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

  const getEventsForDay = (day: Date) => {
    return events.filter((event) =>
      isSameDay(new Date(event.start_date), day)
    );
  };

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length > 0) {
      setSelectedDayEvents(dayEvents);
      setDialogOpen(true);
    }
  };

  const handleRespondToEvent = async (
    eventId: string,
    status: "accepted" | "declined"
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existingResponse = responses.find((r) => r.event_id === eventId);

    if (existingResponse) {
      const { error } = await supabase
        .from("event_responses")
        .update({ status })
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
        notes: null,
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
      description: `Presença ${status === "accepted" ? "confirmada" : "recusada"}`,
    });
    loadResponses();
  };

  const handleUpdateNotes = async () => {
    if (!selectedEventResponse) return;

    const { error } = await supabase
      .from("event_responses")
      .update({ notes: responseNotes })
      .eq("id", selectedEventResponse.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar observações",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Observações salvas",
    });
    setSelectedEventResponse(null);
    setResponseNotes("");
    loadResponses();
  };

  const getResponseForEvent = (eventId: string) => {
    return responses.find((r) => r.event_id === eventId);
  };

  const modifiers = {
    hasEvent: (day: Date) => getEventsForDay(day).length > 0,
  };

  const modifiersClassNames = {
    hasEvent: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full",
  };

  return (
    <Card className="glass-card p-4 sm:p-8 border-primary/30">
      <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
        <CalendarIcon className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
        <h2 className="text-xl sm:text-3xl font-bold">Calendário Mensal</h2>
      </div>

      <div className="flex justify-center mb-6">
        <CalendarComponent
          mode="single"
          selected={date}
          onSelect={setDate}
          onDayClick={handleDayClick}
          locale={ptBR}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="border rounded-lg text-sm sm:text-lg scale-100 sm:scale-125"
        />
      </div>

      <div className="mt-6">
        <h3 className="font-semibold mb-3">Eventos do Mês:</h3>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum evento neste mês
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const response = getResponseForEvent(event.id);
              return (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${
                    event.is_mandatory
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/30 bg-background/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        {event.is_mandatory && (
                          <Badge variant="destructive" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                        {response && (
                          <Badge
                            variant={
                              response.status === "accepted"
                                ? "default"
                                : response.status === "declined"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {response.status === "accepted"
                              ? "Confirmado"
                              : response.status === "declined"
                              ? "Recusado"
                              : "Pendente"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.start_date), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={
                          response?.status === "accepted" ? "default" : "outline"
                        }
                        onClick={() => handleRespondToEvent(event.id, "accepted")}
                        className="h-7 w-7 p-0"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          response?.status === "declined"
                            ? "destructive"
                            : "outline"
                        }
                        onClick={() => handleRespondToEvent(event.id, "declined")}
                        className="h-7 w-7 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {response && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedEventResponse(response);
                          setResponseNotes(response.notes || "");
                        }}
                        className="text-xs h-6"
                      >
                        {response.notes ? "Editar observações" : "Adicionar observações"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eventos do Dia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDayEvents.map((event) => {
              const response = getResponseForEvent(event.id);
              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border ${
                    event.is_mandatory
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{event.title}</h4>
                    {event.is_mandatory && (
                      <Badge variant="destructive">Obrigatório</Badge>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {event.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mb-3">
                    {format(new Date(event.start_date), "HH:mm", {
                      locale: ptBR,
                    })}{" "}
                    -{" "}
                    {format(new Date(event.end_date), "HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={
                        response?.status === "accepted" ? "default" : "outline"
                      }
                      onClick={() => {
                        handleRespondToEvent(event.id, "accepted");
                        setDialogOpen(false);
                      }}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        response?.status === "declined" ? "destructive" : "outline"
                      }
                      onClick={() => {
                        handleRespondToEvent(event.id, "declined");
                        setDialogOpen(false);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Recusar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedEventResponse}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEventResponse(null);
            setResponseNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observações do Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Motivo/Observações</Label>
              <Textarea
                id="notes"
                placeholder="Ex: Tenho compromisso familiar, Estarei viajando, etc..."
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <Button onClick={handleUpdateNotes} className="w-full">
              Salvar Observações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
