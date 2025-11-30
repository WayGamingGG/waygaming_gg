import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Trophy, Target, Clock, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getChampionImageUrlSync } from "@/lib/ddragon";
import { Skeleton } from "@/components/ui/skeleton";

interface SummonerData {
  account: {
    gameName: string;
    tagLine: string;
    puuid: string;
  };
  summoner: {
    profileIconId: number;
    summonerLevel: number;
  };
  ranked: Array<{
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  }>;
}

interface MatchParticipant {
  championName: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  puuid: string;
}

interface Match {
  metadata: {
    matchId: string;
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    participants: MatchParticipant[];
  };
}

export const SummonerSearch = () => {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [summonerData, setSummonerData] = useState<SummonerData | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!gameName || !tagLine) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e a tag do invocador",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Remove o # da tag se o usuário digitou
      const cleanTagLine = tagLine.replace(/^#/, '');
      
      const { data, error } = await supabase.functions.invoke("riot-summoner", {
        body: { gameName, tagLine: cleanTagLine },
      });

      if (error) throw error;

      setSummonerData(data);
      toast({
        title: "Invocador encontrado!",
        description: `${data.account.gameName}#${data.account.tagLine}`,
      });
      
      // Buscar histórico de partidas
      await fetchMatchHistory(data.account.puuid);
    } catch (error: any) {
      console.error("Error fetching summoner:", error);
      toast({
        title: "Erro ao buscar invocador",
        description: error.message || "Verifique os dados e tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchHistory = async (puuid: string) => {
    setLoadingMatches(true);
    try {
      const { data, error } = await supabase.functions.invoke("riot-matches", {
        body: { puuid, count: 10 },
      });

      if (error) throw error;

      setMatches(data.matches || []);
    } catch (error: any) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Erro ao buscar partidas",
        description: error.message || "Não foi possível carregar o histórico",
        variant: "destructive",
      });
    } finally {
      setLoadingMatches(false);
    }
  };

  const getRankBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      IRON: "bg-gray-500",
      BRONZE: "bg-orange-700",
      SILVER: "bg-gray-400",
      GOLD: "bg-yellow-500",
      PLATINUM: "bg-cyan-500",
      EMERALD: "bg-emerald-500",
      DIAMOND: "bg-blue-500",
      MASTER: "bg-purple-500",
      GRANDMASTER: "bg-red-500",
      CHALLENGER: "bg-amber-400",
    };
    return colors[tier] || "bg-muted";
  };

  const formatGameDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    return `${minutes}m atrás`;
  };

  return (
    <Card className="glass-card p-6 border-primary/30">
      <div className="flex items-center space-x-2 mb-6">
        <Search className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold">Buscar Invocador</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Nome do Invocador
            </label>
            <Input
              placeholder="Nome"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="glass-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Tag (sem #)
            </label>
            <Input
              placeholder="BR1, EUW, NA1..."
              value={tagLine}
              onChange={(e) => setTagLine(e.target.value)}
              className="glass-card"
            />
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
        >
          {loading ? "Buscando..." : "Buscar"}
        </Button>

        {summonerData && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center space-x-4 p-4 rounded-lg bg-muted/20 border border-border/30">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${summonerData.summoner.profileIconId}.png`}
                alt="Profile Icon"
                className="w-16 h-16 rounded-full border-2 border-primary/50"
              />
              <div>
                <h4 className="text-lg font-bold">
                  {summonerData.account.gameName}
                  <span className="text-muted-foreground">
                    #{summonerData.account.tagLine}
                  </span>
                </h4>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Nível {summonerData.summoner.summonerLevel}
                </p>
              </div>
            </div>

            {summonerData.ranked.length > 0 && (
              <div className="space-y-3">
                {summonerData.ranked.map((rank, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-5 h-5 text-accent" />
                        <span className="font-medium">
                          {rank.queueType === "RANKED_SOLO_5x5"
                            ? "Solo/Duo"
                            : "Flex 5v5"}
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${getRankBadgeColor(
                          rank.tier
                        )}`}
                      >
                        {rank.tier} {rank.rank}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{rank.leaguePoints} LP</span>
                      <span>
                        {rank.wins}V / {rank.losses}D (
                        {Math.round((rank.wins / (rank.wins + rank.losses)) * 100)}
                        % WR)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Histórico de Partidas */}
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Swords className="w-5 h-5 text-primary" />
                <h4 className="text-lg font-bold">Histórico de Partidas</h4>
              </div>

              {loadingMatches ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : matches.length > 0 ? (
                <div className="space-y-3">
                  {matches.map((match) => {
                    const player = match.info.participants.find(
                      (p) => p.puuid === summonerData.account.puuid
                    );
                    if (!player) return null;

                    return (
                      <div
                        key={match.metadata.matchId}
                        className={`p-4 rounded-lg border ${
                          player.win
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-red-500/10 border-red-500/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <img
                              src={getChampionImageUrlSync(player.championName)}
                              alt={player.championName}
                              className="w-12 h-12 rounded-lg border-2 border-border/50"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${player.championName}.png`;
                              }}
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm">
                                  {player.championName}
                                </span>
                                <span
                                  className={`text-xs font-bold ${
                                    player.win ? "text-emerald-500" : "text-red-500"
                                  }`}
                                >
                                  {player.win ? "VITÓRIA" : "DERROTA"}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {player.kills}/{player.deaths}/{player.assists} KDA
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatGameDuration(match.info.gameDuration)}
                            </div>
                            <div>{formatTimeAgo(match.info.gameCreation)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma partida encontrada
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
