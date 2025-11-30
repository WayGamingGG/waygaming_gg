import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, Search, Sparkles, X } from "lucide-react";
import { getChampionsList, getChampionImageUrlSync, getLatestVersion, type Champion } from "@/lib/ddragon";
import { ChampionSelectModal } from "@/components/ChampionSelectModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Draft = () => {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [blueBans, setBlueBans] = useState<Champion[]>([]);
  const [redBans, setRedBans] = useState<Champion[]>([]);
  const [bluePicks, setBluePicks] = useState<Champion[]>([]);
  const [redPicks, setRedPicks] = useState<Champion[]>([]);
  const [version, setVersion] = useState("");
  const [draggedChampion, setDraggedChampion] = useState<Champion | null>(null);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [selectTarget, setSelectTarget] = useState<{ type: "blueBan" | "redBan" | "bluePick" | "redPick"; index: number } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string>("");
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadChampions = async () => {
      setLoading(true);
      const currentVersion = await getLatestVersion();
      setVersion(currentVersion);
      const data = await getChampionsList();
      setChampions(data);
      setLoading(false);
    };
    loadChampions();
  }, []);

  const filteredChampions = champions.filter(
    (champion) =>
      champion.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      ![...blueBans, ...redBans, ...bluePicks, ...redPicks].filter(Boolean).find((c) => c.id === champion.id)
  );

  const handleReset = () => {
    setBlueBans([]);
    setRedBans([]);
    setBluePicks([]);
    setRedPicks([]);
    setAiSuggestions("");
    setAiAnalysis("");
  };

  const handleDragStart = (champion: Champion) => {
    setDraggedChampion(champion);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (target: { type: "blueBan" | "redBan" | "bluePick" | "redPick"; index: number }) => {
    if (!draggedChampion) return;

    const setters = {
      blueBan: setBlueBans,
      redBan: setRedBans,
      bluePick: setBluePicks,
      redPick: setRedPicks,
    };

    const setter = setters[target.type];
    setter(prev => {
      const newArr = [...prev];
      newArr[target.index] = draggedChampion;
      return newArr;
    });

    setDraggedChampion(null);
  };

  const handleSlotClick = (target: { type: "blueBan" | "redBan" | "bluePick" | "redPick"; index: number }, current: Champion | undefined) => {
    if (current) {
      // Remove champion
      const setters = {
        blueBan: setBlueBans,
        redBan: setRedBans,
        bluePick: setBluePicks,
        redPick: setRedPicks,
      };
      const setter = setters[target.type];
      setter(prev => prev.filter((_, i) => i !== target.index));
    } else {
      // Open select modal
      setSelectTarget(target);
      setSelectModalOpen(true);
    }
  };

  const handleChampionSelect = (champion: Champion) => {
    if (!selectTarget) return;

    const setters = {
      blueBan: setBlueBans,
      redBan: setRedBans,
      bluePick: setBluePicks,
      redPick: setRedPicks,
    };

    const setter = setters[selectTarget.type];
    setter(prev => {
      const newArr = [...prev];
      newArr[selectTarget.index] = champion;
      return newArr;
    });
  };

  const getAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-analysis", {
        body: {
          type: "suggestions",
          bluePicks: bluePicks.filter(Boolean).map(c => c.name),
          redPicks: redPicks.filter(Boolean).map(c => c.name),
          blueBans: blueBans.filter(Boolean).map(c => c.name),
          redBans: redBans.filter(Boolean).map(c => c.name),
        },
      });

      if (error) throw error;
      setAiSuggestions(data.analysis);
    } catch (error: any) {
      console.error("AI suggestions error:", error);
      toast({
        title: "Erro ao obter sugestões",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const getAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-analysis", {
        body: {
          type: "analysis",
          bluePicks: bluePicks.filter(Boolean).map(c => c.name),
          redPicks: redPicks.filter(Boolean).map(c => c.name),
          blueBans: blueBans.filter(Boolean).map(c => c.name),
          redBans: redBans.filter(Boolean).map(c => c.name),
        },
      });

      if (error) throw error;
      setAiAnalysis(data.analysis);
    } catch (error: any) {
      console.error("AI analysis error:", error);
      toast({
        title: "Erro ao obter análise",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoadingAI(false);
    }
  };
  return (
    <div className="min-h-screen bg-background py-4 sm:py-8">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Simulador de Pick & Ban
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Simule drafts profissionais e receba sugestões de counter-picks
            </p>
          </div>
          <Button onClick={handleReset} variant="outline" size="sm" className="border-accent/30 hover:bg-accent/10 w-full sm:w-auto">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reiniciar Draft
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Blue Side */}
          <Card className="glass-card p-3 sm:p-6 border-primary/30 glow-blue">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">Blue Side</h2>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Primeiro Pick
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">BANS</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop({ type: "blueBan", index: i })}
                      onClick={() => handleSlotClick({ type: "blueBan", index: i }, blueBans[i])}
                      className="aspect-square rounded-lg border-2 border-dashed border-primary/30 overflow-hidden hover:border-primary/60 transition-all relative group cursor-pointer"
                    >
                      {blueBans[i] ? (
                        <>
                          <img
                            src={getChampionImageUrlSync(blueBans[i].image.full.replace('.png', ''), version)}
                            alt={blueBans[i].name}
                            className="w-full h-full object-cover opacity-50"
                          />
                          <X className="absolute top-1 right-1 w-4 h-4 text-white bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary/50 text-xs">
                          Ban {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">PICKS</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop({ type: "bluePick", index: i })}
                      onClick={() => handleSlotClick({ type: "bluePick", index: i }, bluePicks[i])}
                      className="aspect-square rounded-lg border-2 border-dashed border-primary/30 overflow-hidden hover:border-primary/60 transition-all relative group cursor-pointer"
                    >
                      {bluePicks[i] ? (
                        <>
                          <img
                            src={getChampionImageUrlSync(bluePicks[i].image.full.replace('.png', ''), version)}
                            alt={bluePicks[i].name}
                            className="w-full h-full object-cover"
                          />
                          <X className="absolute top-1 right-1 w-4 h-4 text-white bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary/50 text-xs">
                          Pick {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-primary">Sugestões IA</h4>
                  <Button
                    size="sm"
                    onClick={getAISuggestions}
                    disabled={loadingAI || bluePicks.length === 0}
                    className="bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {loadingAI ? "Carregando..." : "Gerar"}
                  </Button>
                </div>
                {aiSuggestions ? (
                  <div className="text-sm text-foreground whitespace-pre-wrap">{aiSuggestions}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Selecione picks para receber sugestões da IA
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Red Side */}
          <Card className="glass-card p-3 sm:p-6 border-secondary/30 glow-red">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-secondary">Red Side</h2>
              <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                Último Pick
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">BANS</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop({ type: "redBan", index: i })}
                      onClick={() => handleSlotClick({ type: "redBan", index: i }, redBans[i])}
                      className="aspect-square rounded-lg border-2 border-dashed border-secondary/30 overflow-hidden hover:border-secondary/60 transition-all relative group cursor-pointer"
                    >
                      {redBans[i] ? (
                        <>
                          <img
                            src={getChampionImageUrlSync(redBans[i].image.full.replace('.png', ''), version)}
                            alt={redBans[i].name}
                            className="w-full h-full object-cover opacity-50"
                          />
                          <X className="absolute top-1 right-1 w-4 h-4 text-white bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-secondary/50 text-xs">
                          Ban {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">PICKS</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop({ type: "redPick", index: i })}
                      onClick={() => handleSlotClick({ type: "redPick", index: i }, redPicks[i])}
                      className="aspect-square rounded-lg border-2 border-dashed border-secondary/30 overflow-hidden hover:border-secondary/60 transition-all relative group cursor-pointer"
                    >
                      {redPicks[i] ? (
                        <>
                          <img
                            src={getChampionImageUrlSync(redPicks[i].image.full.replace('.png', ''), version)}
                            alt={redPicks[i].name}
                            className="w-full h-full object-cover"
                          />
                          <X className="absolute top-1 right-1 w-4 h-4 text-white bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-secondary/50 text-xs">
                          Pick {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-secondary">Análise da Comp</h4>
                  <Button
                    size="sm"
                    onClick={getAIAnalysis}
                    disabled={loadingAI || redPicks.length === 0}
                    className="bg-secondary/20 hover:bg-secondary/30 text-secondary border-secondary/30"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {loadingAI ? "Carregando..." : "Analisar"}
                  </Button>
                </div>
                {aiAnalysis ? (
                  <div className="text-sm text-foreground whitespace-pre-wrap">{aiAnalysis}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Selecione picks para análise da IA
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Available Champions Pool */}
        <Card className="glass-card p-3 sm:p-6 mt-4 sm:mt-6 border-accent/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-base sm:text-xl font-bold text-accent">
              Pool de Campeões ({filteredChampions.length})
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campeão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 glass-card text-sm"
              />
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando campeões...
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 max-h-96 overflow-y-auto">
              {filteredChampions.map((champion) => (
                <div
                  key={champion.id}
                  draggable
                  onDragStart={() => handleDragStart(champion)}
                  className="aspect-square rounded-lg overflow-hidden border border-border/30 hover:border-accent/50 cursor-move transition-all hover:scale-105 group relative"
                  title={champion.name}
                >
                  <img
                    src={getChampionImageUrlSync(champion.image.full.replace('.png', ''), version)}
                    alt={champion.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                    <span className="text-xs font-semibold text-foreground truncate px-1">
                      {champion.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <ChampionSelectModal
          open={selectModalOpen}
          onClose={() => setSelectModalOpen(false)}
          champions={filteredChampions}
          onSelect={handleChampionSelect}
          version={version}
          title="Selecione um Campeão"
        />
      </div>
    </div>
  );
};

export default Draft;
