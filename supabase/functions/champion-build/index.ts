import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { championName, role } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get latest version
    const versionResponse = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await versionResponse.json();
    const latestVersion = versions[0];

    // Get items data
    const itemsResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/pt_BR/item.json`);
    const itemsData = await itemsResponse.json();

    // Get runes data
    const runesResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/pt_BR/runesReforged.json`);
    const runesData = await runesResponse.json();

    // Create mappings
    const itemsList = Object.entries(itemsData.data)
      .filter(([_, item]: any) => item.gold?.total > 0 && !item.requiredAlly)
      .map(([id, item]: any) => ({ id, name: item.name }));

    const runesList: any = [];
    runesData.forEach((tree: any) => {
      tree.slots.forEach((slot: any) => {
        slot.runes.forEach((rune: any) => {
          runesList.push({
            id: rune.id,
            key: rune.key,
            name: rune.name,
            icon: rune.icon,
            tree: tree.key
          });
        });
      });
    });

    const systemPrompt = `Você é um especialista em League of Legends. Forneça builds e runas recomendadas com base no meta atual (Season 14). 

    Itens disponíveis: ${itemsList.map((i: any) => i.name).join(", ")}
    
    Árvores de runas: Precision, Domination, Sorcery, Resolve, Inspiration
    
    Responda SEMPRE em formato JSON válido usando EXATAMENTE os nomes dos itens da lista acima.`;
    
    const userPrompt = `Para o campeão ${championName}${role ? ` na posição ${role}` : ""}, forneça:

1. Build Core (3 itens iniciais mais importantes) - USE APENAS nomes EXATOS da lista de itens
2. Itens Situacionais (2-3 opções) - USE APENAS nomes EXATOS da lista de itens
3. Runas Primárias (árvore principal + keystone + 3 runas)
4. Runas Secundárias (árvore secundária + 2 runas)
5. Fragmentos (3 fragmentos)

Formato JSON:
{
  "coreItems": ["Nome EXATO do Item 1", "Nome EXATO do Item 2", "Nome EXATO do Item 3"],
  "situationalItems": ["Item 1", "Item 2", "Item 3"],
  "primaryRunes": {
    "tree": "Precision|Domination|Sorcery|Resolve|Inspiration",
    "keystone": "Nome da Runa Principal",
    "slot1": "Runa 1",
    "slot2": "Runa 2", 
    "slot3": "Runa 3"
  },
  "secondaryRunes": {
    "tree": "Precision|Domination|Sorcery|Resolve|Inspiration",
    "slot1": "Runa 1",
    "slot2": "Runa 2"
  },
  "shards": {
    "offense": "Fragmento Ofensivo",
    "flex": "Fragmento Flex",
    "defense": "Fragmento Defensivo"
  },
  "notes": "Breve explicação da build (2-3 linhas)"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de taxa excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao chamar IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let buildData = data.choices?.[0]?.message?.content || "{}";
    
    // Remove markdown code blocks if present
    buildData = buildData.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON
    const parsedBuild = JSON.parse(buildData);

    // Map item names to IDs
    const mapItemsToIds = (itemNames: string[]) => {
      return itemNames.map(name => {
        const item = itemsList.find((i: any) => 
          i.name.toLowerCase() === name.toLowerCase() ||
          i.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(i.name.toLowerCase())
        );
        return {
          name: name,
          id: item?.id || null
        };
      });
    };

    // Map rune names to data
    const mapRunesToData = (runeName: string) => {
      const rune = runesList.find((r: any) => 
        r.name.toLowerCase() === runeName.toLowerCase() ||
        r.name.toLowerCase().includes(runeName.toLowerCase()) ||
        runeName.toLowerCase().includes(r.name.toLowerCase())
      );
      return {
        name: runeName,
        id: rune?.id || null,
        icon: rune?.icon || null
      };
    };

    // Map shard names to perk IDs
    const mapShardToId = (shardName: string): number => {
      const shardMap: Record<string, number> = {
        // Offense row
        "adaptive force": 5008,
        "força adaptativa": 5008,
        "attack speed": 5005,
        "velocidade de ataque": 5005,
        "ability haste": 5007,
        "aceleração de habilidade": 5007,
        // Flex row
        "adaptive": 5008,
        "armor": 5002,
        "armadura": 5002,
        "magic resist": 5003,
        "resistência mágica": 5003,
        // Defense row
        "health": 5001,
        "vida": 5001,
        "scaling health": 5001,
      };

      const normalized = shardName.toLowerCase();
      for (const [key, value] of Object.entries(shardMap)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          return value;
        }
      }
      return 5008; // Default to adaptive force
    };

    const enrichedBuild = {
      coreItems: mapItemsToIds(parsedBuild.coreItems || []),
      situationalItems: mapItemsToIds(parsedBuild.situationalItems || []),
      primaryRunes: {
        tree: parsedBuild.primaryRunes?.tree || "",
        keystone: mapRunesToData(parsedBuild.primaryRunes?.keystone || ""),
        slot1: mapRunesToData(parsedBuild.primaryRunes?.slot1 || ""),
        slot2: mapRunesToData(parsedBuild.primaryRunes?.slot2 || ""),
        slot3: mapRunesToData(parsedBuild.primaryRunes?.slot3 || "")
      },
      secondaryRunes: {
        tree: parsedBuild.secondaryRunes?.tree || "",
        slot1: mapRunesToData(parsedBuild.secondaryRunes?.slot1 || ""),
        slot2: mapRunesToData(parsedBuild.secondaryRunes?.slot2 || "")
      },
      shards: {
        offense: {
          name: parsedBuild.shards?.offense || "",
          id: mapShardToId(parsedBuild.shards?.offense || "")
        },
        flex: {
          name: parsedBuild.shards?.flex || "",
          id: mapShardToId(parsedBuild.shards?.flex || "")
        },
        defense: {
          name: parsedBuild.shards?.defense || "",
          id: mapShardToId(parsedBuild.shards?.defense || "")
        }
      },
      notes: parsedBuild.notes,
      version: latestVersion
    };

    return new Response(JSON.stringify({ build: enrichedBuild }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("champion-build error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
