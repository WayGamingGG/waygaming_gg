// U.GG public JSON integration
import { supabase } from "@/integrations/supabase/client";
import { getLatestVersion, type Champion } from "./ddragon";
import type { ChampionCounter, ChampionMeta } from "./opgg";

const UGG_BASE = "https://stats2.u.gg/lol/1.1.1";
const CACHE_KEY_PREFIX = "ugg_";
const CACHE_EXPIRY = 6 * 60 * 60 * 1000; // 6 hours

interface CacheData<T> { data: T; timestamp: number }

const setCache = <T>(key: string, data: T) => {
  try {
    const cacheData: CacheData<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(cacheData));
  } catch {}
};

const getCache = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (!raw) return null;
    const cache: CacheData<T> = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
      return null;
    }
    return cache.data;
  } catch { return null; }
};

// Convert ddragon version (e.g. 14.24.1) to U.GG patch (14_24)
const toUggPatch = (ddVersion: string) => {
  const [major, minor] = ddVersion.split(".");
  return `${major}_${minor}`;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`UGG request failed ${res.status}`);
  return res.json() as Promise<T>;
};

export const getUggChampionId = (champions: Champion[], nameOrId: string): number | null => {
  const c = champions.find(c => c.name.toLowerCase() === nameOrId.toLowerCase() || c.id.toLowerCase() === nameOrId.toLowerCase());
  if (c) return Number(c.key);
  return null;
};

export const idToChampionName = (champions: Champion[], id: number): string => {
  const c = champions.find(ch => Number(ch.key) === id);
  return c?.name ?? String(id);
};

// Fetch champion stats (winRate, pickRate, etc.) from overview
export const getUggChampionStats = async (champions: Champion[], championName: string): Promise<ChampionMeta | null> => {
  try {
    const dd = await getLatestVersion();
    const patch = toUggPatch(dd);
    const cacheKey = `overview_${patch}`;
    type Overview = any;
    let overview = getCache<Overview>(cacheKey);
    if (!overview) {
      const { data, error } = await supabase.functions.invoke("ugg-champion-overview", {
        body: { patch },
      });
      if (error) throw error;
      const payload = (data && (data.result ?? data)) as any;
      // Our edge function returns raw JSON from U.GG
      overview = payload;
      setCache(cacheKey, overview);
    }

    const champId = getUggChampionId(champions, championName);
    if (!champId) return null;

    // Heuristic parsing: try common shapes
    let entry: any = null;
    if (Array.isArray(overview)) {
      // find object with championId or cid matching
      entry = overview.find((e: any) => (e.championId ?? e.cid) === champId || (e.id === champId));
    } else if (overview?.data && Array.isArray(overview.data)) {
      entry = overview.data.find((e: any) => (e.championId ?? e.cid) === champId || (e.id === champId));
    } else if (overview && typeof overview === 'object') {
      // sometimes keyed by champion id
      entry = overview[String(champId)] ?? overview[champId];
    }

    const winRate = Number(entry?.winRate ?? entry?.win_rate ?? entry?.wr ?? entry?.win ?? 0);
    const pickRate = Number(entry?.pickRate ?? entry?.pick_rate ?? entry?.pr ?? 0);
    const banRate = Number(entry?.banRate ?? entry?.ban_rate ?? entry?.br ?? 0);
    const games = Number(entry?.games ?? entry?.n ?? entry?.count ?? 0);
    const kda = Number(entry?.kda ?? 0);

    return {
      championName,
      tier: "",
      position: "",
      winRate,
      pickRate,
      banRate,
      games,
      avgKills: Number(entry?.avgKills ?? 0),
      avgDeaths: Number(entry?.avgDeaths ?? 0),
      avgAssists: Number(entry?.avgAssists ?? 0),
      kda,
    };
  } catch (e) {
    console.warn("UGG overview parse failed", e);
    return null;
  }
};

export const getUggMatchups = async (champions: Champion[], championName: string): Promise<{ best: ChampionCounter[]; worst: ChampionCounter[] }> => {
  try {
    const dd = await getLatestVersion();
    const patch = toUggPatch(dd);
    const champId = getUggChampionId(champions, championName);
    if (!champId) return { best: [], worst: [] };

    const cacheKey = `matchups_${patch}_${champId}`;
    let data = getCache<any>(cacheKey);
    if (!data) {
      const { data: resp, error } = await supabase.functions.invoke("ugg-champion-matchups", {
        body: { patch, championId: champId },
      });
      if (error) throw error;
      const payload = (resp && (resp.result ?? resp)) as any;
      data = payload;
      setCache(cacheKey, data);
    }

    // Heuristic: locate the array of matchups
    let list: any[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data?.matchups && Array.isArray(data.matchups)) {
      list = data.matchups;
    } else if (data && typeof data === 'object') {
      // find first array value long enough
      const firstArray = Object.values(data).find(v => Array.isArray(v) && v.length > 10) as any[] | undefined;
      if (firstArray) list = firstArray;
    }

    // Map generic entries to ChampionCounter
    const parsed: ChampionCounter[] = list.map((row: any) => {
      const oppId = Number(row?.enemyChampionId ?? row?.opponentId ?? row?.cid ?? row?.id ?? row?.[0]);
      const wr = Number(row?.winRate ?? row?.win_rate ?? row?.wr ?? row?.[1] ?? 0) * (row?.[1] && row?.[1] <= 1 ? 100 : 1);
      const games = Number(row?.games ?? row?.count ?? row?.n ?? row?.[2] ?? 0);
      return {
        championName: idToChampionName(champions, oppId),
        winRate: isFinite(wr) ? wr : 0,
        games: isFinite(games) ? games : 0,
        laneWinRate: undefined,
      } as ChampionCounter;
    }).filter(m => !!m.championName && m.games >= 0);

    const sorted = parsed.sort((a, b) => b.winRate - a.winRate);
    return {
      best: sorted.slice(0, 20),
      worst: sorted.slice(-20).reverse(),
    };
  } catch (e) {
    console.warn("UGG matchups parse failed", e);
    return { best: [], worst: [] };
  }
};

export const clearUGGCache = () => {
  try {
    Object.keys(localStorage).forEach(k => { if (k.startsWith(CACHE_KEY_PREFIX)) localStorage.removeItem(k); });
  } catch {}
};
