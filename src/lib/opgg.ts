// OP.GG MCP API Integration via Edge Functions
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY_PREFIX = "opgg_";
const CACHE_EXPIRY = 6 * 60 * 60 * 1000; // 6 hours

interface CacheData<T> {
  data: T;
  timestamp: number;
}

// Cache utilities
const setCache = <T>(key: string, data: T): void => {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Failed to set OP.GG cache:", error);
  }
};

const getCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (!cached) return null;

    const cacheData: CacheData<T> = JSON.parse(cached);
    const isExpired = Date.now() - cacheData.timestamp > CACHE_EXPIRY;

    if (isExpired) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.warn("Failed to get OP.GG cache:", error);
    return null;
  }
};

// Types based on OP.GG MCP API response structure
export interface ChampionCounter {
  championName: string;
  winRate: number;
  games: number;
  laneWinRate?: number;
}

export interface ChampionAnalysis {
  championName: string;
  tier: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  kda: number;
  weakCounters: ChampionCounter[];
  strongCounters: ChampionCounter[];
}

export interface ChampionMeta {
  championName: string;
  tier: string;
  position: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  games: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kda: number;
}

export interface PositionStats {
  position: string;
  winRate: number;
  pickRate: number;
  games: number;
}

// API Functions

/**
 * Get champion analysis including counters
 */
export const getChampionAnalysis = async (
  championName: string,
  tier: string = "platinum_plus",
  position?: string
): Promise<ChampionAnalysis | null> => {
  try {
    const cacheKey = `analysis_${championName}_${tier}_${position || 'all'}`;
    const cached = getCache<ChampionAnalysis>(cacheKey);
    if (cached) return cached;

    console.log(`Fetching analysis for ${championName} via edge function`);

    const { data, error } = await supabase.functions.invoke("opgg-champion-analysis", {
      body: { championName, tier, position },
    });

    if (error) {
      console.error("Edge function error:", error);
      return null;
    }

    // Parse the MCP response (supports both {result:{content}} and direct {result} objects)
    const root = (data && (data.result ?? data)) as any;
    const content = root?.content?.[0];
    let analysisData: ChampionAnalysis | null = null;

    if (content?.type === "text" && typeof content.text === "string") {
      try {
        const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
        analysisData = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content.text);
      } catch (e) {
        console.warn("Failed to parse analysis data from text:", e);
      }
    } else if (root && !root?.content) {
      // Some servers return the JSON directly in result
      analysisData = root as ChampionAnalysis;
    }

    if (!analysisData) {
      console.warn("No content in OP.GG response");
      return null;
    }

    // Normalize keys if server returns snake_case
    analysisData = {
      championName: (analysisData as any).championName ?? (analysisData as any).champion_name ?? championName,
      tier: (analysisData as any).tier ?? (analysisData as any).rank_tier ?? "",
      winRate: (analysisData as any).winRate ?? (analysisData as any).win_rate ?? 0,
      pickRate: (analysisData as any).pickRate ?? (analysisData as any).pick_rate ?? 0,
      banRate: (analysisData as any).banRate ?? (analysisData as any).ban_rate ?? 0,
      kda: (analysisData as any).kda ?? 0,
      weakCounters: ((analysisData as any).weakCounters ?? (analysisData as any).weak_counters ?? []).map((c: any) => ({
        championName: c.championName ?? c.champion_name ?? "",
        winRate: c.winRate ?? c.win_rate ?? 0,
        games: c.games ?? 0,
        laneWinRate: c.laneWinRate ?? c.lane_win_rate,
      })),
      strongCounters: ((analysisData as any).strongCounters ?? (analysisData as any).strong_counters ?? []).map((c: any) => ({
        championName: c.championName ?? c.champion_name ?? "",
        winRate: c.winRate ?? c.win_rate ?? 0,
        games: c.games ?? 0,
        laneWinRate: c.laneWinRate ?? c.lane_win_rate,
      })),
    } as ChampionAnalysis;

    setCache(cacheKey, analysisData);
    return analysisData;
  } catch (error) {
    console.error("Error fetching champion analysis:", error);
    return null;
  }
};

/**
 * Get champion meta data
 */
export const getChampionMeta = async (
  championName: string,
  tier: string = "platinum_plus",
  position?: string
): Promise<ChampionMeta | null> => {
  try {
    const cacheKey = `meta_${championName}_${tier}_${position || 'all'}`;
    const cached = getCache<ChampionMeta>(cacheKey);
    if (cached) return cached;

    console.log(`Fetching meta for ${championName} via edge function`);

    const { data, error } = await supabase.functions.invoke("opgg-champion-meta", {
      body: { championName, tier, position },
    });

    if (error) {
      console.error("Edge function error:", error);
      return null;
    }

    const root = (data && (data.result ?? data)) as any;
    const content = root?.content?.[0];
    let metaData: ChampionMeta | null = null;

    if (content?.type === "text" && typeof content.text === "string") {
      try {
        const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
        metaData = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content.text);
      } catch (e) {
        console.warn("Failed to parse meta data from text:", e);
      }
    } else if (root && !root?.content) {
      metaData = root as ChampionMeta;
    }

    if (!metaData) {
      console.warn("No content in OP.GG response");
      return null;
    }

    metaData = {
      championName: (metaData as any).championName ?? (metaData as any).champion_name ?? championName,
      tier: (metaData as any).tier ?? (metaData as any).rank_tier ?? "",
      position: (metaData as any).position ?? (metaData as any).lane ?? "",
      winRate: (metaData as any).winRate ?? (metaData as any).win_rate ?? 0,
      pickRate: (metaData as any).pickRate ?? (metaData as any).pick_rate ?? 0,
      banRate: (metaData as any).banRate ?? (metaData as any).ban_rate ?? 0,
      games: (metaData as any).games ?? 0,
      avgKills: (metaData as any).avgKills ?? (metaData as any).avg_kills ?? 0,
      avgDeaths: (metaData as any).avgDeaths ?? (metaData as any).avg_deaths ?? 0,
      avgAssists: (metaData as any).avgAssists ?? (metaData as any).avg_assists ?? 0,
      kda: (metaData as any).kda ?? 0,
    } as ChampionMeta;

    setCache(cacheKey, metaData);
    return metaData;
  } catch (error) {
    console.error("Error fetching champion meta:", error);
    return null;
  }
};

/**
 * Get champion position statistics
 */
export const getChampionPositions = async (
  championName: string,
  tier: string = "platinum_plus"
): Promise<PositionStats[]> => {
  try {
    const cacheKey = `positions_${championName}_${tier}`;
    const cached = getCache<PositionStats[]>(cacheKey);
    if (cached) return cached;

    console.log(`Fetching positions for ${championName} via edge function`);

    const { data, error } = await supabase.functions.invoke("opgg-champion-positions", {
      body: { championName, tier },
    });

    if (error) {
      console.error("Edge function error:", error);
      return [];
    }

    const root = (data && (data.result ?? data)) as any;
    const content = root?.content?.[0];
    let positionsData: PositionStats[] = [];

    if (content?.type === "text" && typeof content.text === "string") {
      try {
        const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
        positionsData = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content.text);
      } catch (e) {
        console.warn("Failed to parse positions data from text:", e);
      }
    } else if (root && !root?.content) {
      positionsData = (root as any[] | PositionStats[]) as PositionStats[];
    }

    if (!positionsData || positionsData.length === 0) {
      console.warn("No content in OP.GG response");
      return [];
    }

    setCache(cacheKey, positionsData);
    return positionsData;
  } catch (error) {
    console.error("Error fetching champion positions:", error);
    return [];
  }
};

/**
 * Get best matchups (champions this champion performs well against)
 */
export const getBestMatchups = async (
  championName: string,
  tier: string = "platinum_plus",
  position?: string
): Promise<ChampionCounter[]> => {
  try {
    const analysis = await getChampionAnalysis(championName, tier, position);
    return analysis?.strongCounters || [];
  } catch (error) {
    console.error("Error fetching best matchups:", error);
    return [];
  }
};

/**
 * Get worst matchups (champions that counter this champion)
 */
export const getWorstMatchups = async (
  championName: string,
  tier: string = "platinum_plus",
  position?: string
): Promise<ChampionCounter[]> => {
  try {
    const analysis = await getChampionAnalysis(championName, tier, position);
    return analysis?.weakCounters || [];
  } catch (error) {
    console.error("Error fetching worst matchups:", error);
    return [];
  }
};

/**
 * Get champion statistics
 */
export const getChampionStats = async (
  championName: string,
  tier: string = "platinum_plus",
  position?: string
): Promise<ChampionMeta | null> => {
  return getChampionMeta(championName, tier, position);
};

/**
 * Clear OP.GG cache
 */
export const clearOPGGCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log("OP.GG cache cleared");
  } catch (error) {
    console.warn("Failed to clear OP.GG cache:", error);
  }
};
