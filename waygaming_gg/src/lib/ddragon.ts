// Data Dragon API service - Complete integration with caching
const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";
const CACHE_KEY_PREFIX = "ddragon_";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_LANGUAGE = "pt_BR";

interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}

export interface Champion {
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  info: {
    attack: number;
    defense: number;
    magic: number;
    difficulty: number;
  };
  image: {
    full: string;
    sprite: string;
  };
  tags: string[];
  partype: string;
  stats: Record<string, number>;
}

export interface ChampionDetailed extends Champion {
  lore: string;
  allytips: string[];
  enemytips: string[];
  spells: ChampionSpell[];
  passive: ChampionPassive;
  skins: ChampionSkin[];
  recommended: any[];
}

export interface ChampionSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  image: {
    full: string;
  };
  cooldown: number[];
  cost: number[];
  range: number[];
}

export interface ChampionPassive {
  name: string;
  description: string;
  image: {
    full: string;
  };
}

export interface ChampionSkin {
  id: string;
  num: number;
  name: string;
  chromas: boolean;
}

export interface Item {
  name: string;
  description: string;
  plaintext: string;
  gold: {
    base: number;
    total: number;
    sell: number;
    purchasable: boolean;
  };
  tags: string[];
  stats: Record<string, number>;
  image: {
    full: string;
  };
}

export interface Rune {
  id: number;
  key: string;
  icon: string;
  name: string;
  slots: RuneSlot[];
}

export interface RuneSlot {
  runes: RuneDetail[];
}

export interface RuneDetail {
  id: number;
  key: string;
  icon: string;
  name: string;
  shortDesc: string;
  longDesc: string;
}

export interface SummonerSpell {
  id: string;
  name: string;
  description: string;
  image: {
    full: string;
  };
  cooldown: number[];
  modes: string[];
}

// Cache utilities
const setCache = <T>(key: string, data: T, version: string): void => {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
      version,
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Failed to set cache:", error);
  }
};

const getCache = <T>(key: string, currentVersion: string): T | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (!cached) return null;

    const cacheData: CacheData<T> = JSON.parse(cached);
    const isExpired = Date.now() - cacheData.timestamp > CACHE_EXPIRY;
    const isOldVersion = cacheData.version !== currentVersion;

    if (isExpired || isOldVersion) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.warn("Failed to get cache:", error);
    return null;
  }
};

// Get latest LoL version
export const getLatestVersion = async (): Promise<string> => {
  try {
    const cached = getCache<string>("version", "latest");
    if (cached) return cached;

    const response = await fetch(`${DDRAGON_BASE}/api/versions.json`);
    const versions: string[] = await response.json();
    const latestVersion = versions[0];

    setCache("version", latestVersion, "latest");
    return latestVersion;
  } catch (error) {
    console.error("Error fetching latest version:", error);
    return "14.24.1"; // Fallback version
  }
};

// Champions
export const getChampionsList = async (language: string = DEFAULT_LANGUAGE): Promise<Champion[]> => {
  try {
    const version = await getLatestVersion();
    const cacheKey = `champions_${language}`;
    const cached = getCache<Champion[]>(cacheKey, version);
    if (cached) return cached;

    const response = await fetch(
      `${DDRAGON_BASE}/cdn/${version}/data/${language}/champion.json`
    );
    const data = await response.json();
    const champions = Object.values(data.data) as Champion[];

    setCache(cacheKey, champions, version);
    return champions;
  } catch (error) {
    console.error("Error fetching champions list:", error);
    return [];
  }
};

export const getChampionDetails = async (
  championName: string,
  language: string = DEFAULT_LANGUAGE
): Promise<ChampionDetailed | null> => {
  try {
    const version = await getLatestVersion();
    const cacheKey = `champion_${championName}_${language}`;
    const cached = getCache<ChampionDetailed>(cacheKey, version);
    if (cached) return cached;

    const response = await fetch(
      `${DDRAGON_BASE}/cdn/${version}/data/${language}/champion/${championName}.json`
    );
    const data = await response.json();
    const champion = data.data[championName] as ChampionDetailed;

    setCache(cacheKey, champion, version);
    return champion;
  } catch (error) {
    console.error(`Error fetching champion details for ${championName}:`, error);
    return null;
  }
};

// Items
export const getItemsList = async (language: string = DEFAULT_LANGUAGE): Promise<Record<string, Item>> => {
  try {
    const version = await getLatestVersion();
    const cacheKey = `items_${language}`;
    const cached = getCache<Record<string, Item>>(cacheKey, version);
    if (cached) return cached;

    const response = await fetch(
      `${DDRAGON_BASE}/cdn/${version}/data/${language}/item.json`
    );
    const data = await response.json();
    const items = data.data as Record<string, Item>;

    setCache(cacheKey, items, version);
    return items;
  } catch (error) {
    console.error("Error fetching items list:", error);
    return {};
  }
};

// Runes
export const getRunesList = async (language: string = DEFAULT_LANGUAGE): Promise<Rune[]> => {
  try {
    const version = await getLatestVersion();
    const cacheKey = `runes_${language}`;
    const cached = getCache<Rune[]>(cacheKey, version);
    if (cached) return cached;

    const response = await fetch(
      `${DDRAGON_BASE}/cdn/${version}/data/${language}/runesReforged.json`
    );
    const runes = await response.json() as Rune[];

    setCache(cacheKey, runes, version);
    return runes;
  } catch (error) {
    console.error("Error fetching runes list:", error);
    return [];
  }
};

// Summoner Spells
export const getSummonerSpellsList = async (
  language: string = DEFAULT_LANGUAGE
): Promise<Record<string, SummonerSpell>> => {
  try {
    const version = await getLatestVersion();
    const cacheKey = `spells_${language}`;
    const cached = getCache<Record<string, SummonerSpell>>(cacheKey, version);
    if (cached) return cached;

    const response = await fetch(
      `${DDRAGON_BASE}/cdn/${version}/data/${language}/summoner.json`
    );
    const data = await response.json();
    const spells = data.data as Record<string, SummonerSpell>;

    setCache(cacheKey, spells, version);
    return spells;
  } catch (error) {
    console.error("Error fetching summoner spells:", error);
    return {};
  }
};

// Image URLs
export const getChampionImageUrl = async (championId: string): Promise<string> => {
  const version = await getLatestVersion();
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${championId}.png`;
};

export const getChampionSplashUrl = (championId: string, skinNum: number = 0): string => {
  return `${DDRAGON_BASE}/cdn/img/champion/splash/${championId}_${skinNum}.jpg`;
};

export const getChampionLoadingUrl = (championId: string, skinNum: number = 0): string => {
  return `${DDRAGON_BASE}/cdn/img/champion/loading/${championId}_${skinNum}.jpg`;
};

export const getItemImageUrl = async (itemId: string): Promise<string> => {
  const version = await getLatestVersion();
  return `${DDRAGON_BASE}/cdn/${version}/img/item/${itemId}.png`;
};

export const getSpellImageUrl = async (spellName: string): Promise<string> => {
  const version = await getLatestVersion();
  return `${DDRAGON_BASE}/cdn/${version}/img/spell/${spellName}.png`;
};

export const getRuneImageUrl = (iconPath: string): string => {
  return `${DDRAGON_BASE}/cdn/img/${iconPath}`;
};

export const getPassiveImageUrl = async (passiveImage: string): Promise<string> => {
  const version = await getLatestVersion();
  return `${DDRAGON_BASE}/cdn/${version}/img/passive/${passiveImage}`;
};

// Utility function to clear cache
export const clearCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log("Data Dragon cache cleared");
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
};

// Legacy exports for backward compatibility
export const fetchChampions = getChampionsList;

// Sync version that returns the URL immediately (for images already loaded)
export const getChampionImageUrlSync = (championId: string, version: string = "14.24.1"): string => {
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${championId}.png`;
};

export { DEFAULT_LANGUAGE };
