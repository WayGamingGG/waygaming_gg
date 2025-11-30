import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Target, Shield, Swords, Search, RefreshCw } from "lucide-react";
import { getChampionsList, getChampionImageUrlSync, getLatestVersion, type Champion } from "@/lib/ddragon";
import { getBestMatchups, getWorstMatchups, getChampionStats, type ChampionCounter, type ChampionMeta } from "@/lib/opgg";
import { getUggMatchups, getUggChampionStats } from "@/lib/ugg";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Matchups = () => {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChampion, setSelectedChampion] = useState<Champion | null>(null);
  const [version, setVersion] = useState("");
  const [bestMatchups, setBestMatchups] = useState<ChampionCounter[]>([]);
  const [worstMatchups, setWorstMatchups] = useState<ChampionCounter[]>([]);
  const [championStats, setChampionStats] = useState<ChampionMeta | null>(null);
  const [loadingMatchups, setLoadingMatchups] = useState(false);
  const [buildData, setBuildData] = useState<any>(null);
  const [loadingBuild, setLoadingBuild] = useState(false);
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

  useEffect(() => {
    if (selectedChampion) {
      loadMatchupData();
      setLoadingBuild(true);
      setBuildData(null);
      
      const timeoutId = setTimeout(() => {
        loadBuildData();
      }, 600);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedChampion]);

  const loadMatchupData = async () => {
    if (!selectedChampion) return;

    setLoadingMatchups(true);
    try {
      console.log(`Loading matchup data for: ${selectedChampion.name}`);
      
      // OP.GG e U.GG estão com problemas de acesso
      // Mostrando mensagem temporária até integração estável
      toast({
        title: "Dados temporariamente indisponíveis",
        description: `A integração com APIs externas está em manutenção. Use a página Draft para análises com IA.`,
      });

      setBestMatchups([]);
      setWorstMatchups([]);
      setChampionStats({
        championName: selectedChampion.name,
        tier: "",
        position: "",
        winRate: 0,
        pickRate: 0,
        banRate: 0,
        games: 0,
        avgKills: 0,
        avgDeaths: 0,
        avgAssists: 0,
        kda: 0,
      });
    } catch (error) {
      console.error("Error loading matchup data:", error);
    } finally {
      setLoadingMatchups(false);
    }
  };

  const loadBuildData = async () => {
    if (!selectedChampion) return;

    setLoadingBuild(true);
    try {
      const { data, error } = await supabase.functions.invoke("champion-build", {
        body: {
          championName: selectedChampion.name,
          role: selectedChampion.tags[0]
        }
      });

      if (error) throw error;
      setBuildData(data.build);
    } catch (error: any) {
      console.error("Error loading build data:", error);
      toast({
        title: "Erro ao carregar build",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoadingBuild(false);
    }
  };

  const filteredChampions = champions.filter((champion) =>
    champion.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getChampionByName = (name: string): Champion | undefined => {
    return champions.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() || 
             c.id.toLowerCase() === name.toLowerCase() ||
             c.name.toLowerCase().includes(name.toLowerCase())
    );
  };

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Análise de Matchups
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Descubra os melhores e piores confrontos para cada campeão
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Champion Selection */}
          <Card className="glass-card p-3 sm:p-6 border-primary/30 lg:col-span-1">
            <h3 className="text-lg font-bold mb-4">Selecionar Campeão</h3>
            
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campeão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 glass-card"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredChampions.map((champion) => (
                  <div
                    key={champion.id}
                    onClick={() => setSelectedChampion(champion)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedChampion?.id === champion.id
                        ? "bg-primary/20 border-primary/50 border"
                        : "bg-muted/20 hover:bg-muted/30 border border-border/30"
                    }`}
                  >
                    <img
                      src={getChampionImageUrlSync(champion.image.full.replace('.png', ''), version)}
                      alt={champion.name}
                      className="w-12 h-12 rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{champion.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{champion.title}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {champion.tags[0]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Matchup Analysis */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {selectedChampion ? (
              <>
                {/* Champion Stats */}
                <Card className="glass-card p-3 sm:p-6 border-primary/30">
                  <div className="flex items-start space-x-6">
                    <img
                      src={getChampionImageUrlSync(selectedChampion.image.full.replace('.png', ''), version)}
                      alt={selectedChampion.name}
                      className="w-24 h-24 rounded-lg border-2 border-primary/50"
                    />
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-1">{selectedChampion.name}</h2>
                      <p className="text-muted-foreground mb-4">{selectedChampion.title}</p>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Target className="w-5 h-5 text-accent" />
                          <div>
                            <p className="text-2xl font-bold text-accent">
                              {championStats ? `${championStats.winRate.toFixed(1)}%` : "---"}
                            </p>
                            <p className="text-xs text-muted-foreground">Win Rate</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Swords className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {championStats ? championStats.kda.toFixed(1) : "---"}
                            </p>
                            <p className="text-xs text-muted-foreground">KDA</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Shield className="w-5 h-5 text-secondary" />
                          <div>
                            <p className="text-2xl font-bold text-secondary">
                              {championStats ? `${championStats.pickRate.toFixed(1)}%` : "---"}
                            </p>
                            <p className="text-xs text-muted-foreground">Pick Rate</p>
                          </div>
                        </div>
                      </div>
                      {loadingMatchups && (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Carregando dados...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Best Matchups */}
                <Card className="glass-card p-6 border-accent/30">
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    <h3 className="text-xl font-bold text-accent">
                      Melhores Matchups ({bestMatchups.length})
                    </h3>
                  </div>
                  {loadingMatchups ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </div>
                  ) : bestMatchups.length > 0 ? (
                    <div className="space-y-3">
                      {bestMatchups.slice(0, 5).map((matchup, idx) => {
                        const champion = getChampionByName(matchup.championName);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              {champion && (
                                <img
                                  src={getChampionImageUrlSync(champion.image.full.replace('.png', ''), version)}
                                  alt={matchup.championName}
                                  className="w-12 h-12 rounded-lg"
                                />
                              )}
                              <div>
                                <p className="font-semibold">{matchup.championName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {matchup.games.toLocaleString()} partidas
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-accent/20 text-accent border-accent/30 mb-1">
                                {matchup.winRate.toFixed(1)}%
                              </Badge>
                              {matchup.laneWinRate && (
                                <p className="text-xs text-muted-foreground">
                                  Lane: {matchup.laneWinRate.toFixed(1)}%
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Dados não disponíveis</p>
                      <p className="text-xs mt-2">Não encontramos dados para este campeão no momento.</p>
                    </div>
                  )}
                </Card>

                {/* Worst Matchups */}
                <Card className="glass-card p-6 border-secondary/30">
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingDown className="w-5 h-5 text-secondary" />
                    <h3 className="text-xl font-bold text-secondary">
                      Piores Matchups ({worstMatchups.length})
                    </h3>
                  </div>
                  {loadingMatchups ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </div>
                  ) : worstMatchups.length > 0 ? (
                    <div className="space-y-3">
                      {worstMatchups.slice(0, 5).map((matchup, idx) => {
                        const champion = getChampionByName(matchup.championName);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-secondary/20 hover:bg-secondary/10 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              {champion && (
                                <img
                                  src={getChampionImageUrlSync(champion.image.full.replace('.png', ''), version)}
                                  alt={matchup.championName}
                                  className="w-12 h-12 rounded-lg"
                                />
                              )}
                              <div>
                                <p className="font-semibold">{matchup.championName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {matchup.games.toLocaleString()} partidas
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-secondary/20 text-secondary border-secondary/30 mb-1">
                                {matchup.winRate.toFixed(1)}%
                              </Badge>
                              {matchup.laneWinRate && (
                                <p className="text-xs text-muted-foreground">
                                  Lane: {matchup.laneWinRate.toFixed(1)}%
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Dados não disponíveis</p>
                      <p className="text-xs mt-2">Não encontramos dados para este campeão no momento.</p>
                    </div>
                  )}
                </Card>

                {/* Build Recommendations */}
                <Card className="glass-card p-6 border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Build Recomendada</h3>
                    {loadingBuild && (
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                  
                  {buildData ? (
                    <div className="space-y-6">
                      {/* Core Items */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-3">
                          Itens Core
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {buildData.coreItems?.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col items-center p-2 rounded-lg bg-primary/5 border border-primary/20">
                              {item.id ? (
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${buildData.version}/img/item/${item.id}.png`}
                                  alt={item.name}
                                  className="w-10 h-10 rounded mb-1"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted/30 mb-1" />
                              )}
                              <p className="text-[10px] font-medium text-center leading-tight">{item.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Situational Items */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-3">
                          Itens Situacionais
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {buildData.situationalItems?.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col items-center p-1.5 rounded bg-muted/30 border border-border/30">
                              {item.id ? (
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${buildData.version}/img/item/${item.id}.png`}
                                  alt={item.name}
                                  className="w-8 h-8 rounded mb-1"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted/50 mb-1" />
                              )}
                              <p className="text-[10px] font-medium text-center leading-tight">{item.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Primary Runes */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-3">
                          Runas Primárias - {buildData.primaryRunes?.tree}
                        </p>
                        <div className="space-y-2">
                          <div className="p-2 rounded-lg bg-accent/10 border border-accent/30 flex items-center space-x-2">
                            {buildData.primaryRunes?.keystone?.icon ? (
                              <img
                                src={`https://ddragon.leagueoflegends.com/cdn/img/${buildData.primaryRunes.keystone.icon}`}
                                alt={buildData.primaryRunes.keystone.name}
                                className="w-10 h-10 rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted/50" />
                            )}
                            <div>
                              <p className="text-xs font-bold text-accent">{buildData.primaryRunes?.keystone?.name}</p>
                              <p className="text-[10px] text-muted-foreground">Pedra Angular</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[buildData.primaryRunes?.slot1, buildData.primaryRunes?.slot2, buildData.primaryRunes?.slot3].map((rune: any, i: number) => (
                              <div key={i} className="flex flex-col items-center p-1.5 rounded bg-muted/30 border border-border/30">
                                {rune?.icon ? (
                                  <img
                                    src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`}
                                    alt={rune.name}
                                    className="w-7 h-7 rounded mb-1"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-muted/50 mb-1" />
                                )}
                                <p className="text-[10px] text-center leading-tight">{rune?.name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Secondary Runes */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-3">
                          Runas Secundárias - {buildData.secondaryRunes?.tree}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[buildData.secondaryRunes?.slot1, buildData.secondaryRunes?.slot2].map((rune: any, i: number) => (
                            <div key={i} className="flex flex-col items-center p-1.5 rounded bg-muted/30 border border-border/30">
                              {rune?.icon ? (
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`}
                                  alt={rune.name}
                                  className="w-7 h-7 rounded mb-1"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-muted/50 mb-1" />
                              )}
                              <p className="text-[10px] text-center leading-tight">{rune?.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shards */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-3">
                          Fragmentos
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {[buildData.shards?.offense, buildData.shards?.flex, buildData.shards?.defense].map((shard: any, i: number) => (
                            <div key={i} className="flex flex-col items-center p-1.5 rounded bg-muted/30 border border-border/30">
                              {shard?.id ? (
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/StatMods/${shard.id}Icon.png`}
                                  alt={shard.name}
                                  className="w-6 h-6 mb-1"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded bg-muted/50 mb-1" />
                              )}
                              <p className="text-[10px] text-center font-medium leading-tight">{shard?.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      {buildData.notes && (
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-sm text-muted-foreground italic">{buildData.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-2">
                          Itens Core
                        </p>
                        <div className="flex space-x-2">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="w-12 h-12 rounded-lg bg-muted/30 border border-border/30"
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-2">
                          Runas Principais
                        </p>
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="w-10 h-10 rounded-full bg-muted/30 border border-border/30"
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center pt-4">
                        Aguardando dados do campeão...
                      </p>
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <Card className="glass-card p-12 border-border/50">
                <div className="text-center">
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Selecione um Campeão</h3>
                  <p className="text-muted-foreground">
                    Escolha um campeão na lista ao lado para ver análise detalhada de matchups
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Matchups;
