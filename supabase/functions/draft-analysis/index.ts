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
    const { type, bluePicks, redPicks, blueBans, redBans, userMessage, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "suggestions") {
      systemPrompt = `Você é um coach profissional de League of Legends. Forneça sugestões estratégicas diretas e objetivas.`;
      
      userPrompt = `Red Side - Bans: ${redBans.join(", ") || "Nenhum"}
Red Side - Picks: ${redPicks.join(", ") || "Nenhum"}

**Sugestões Estratégicas (3-5):**
**Necessidades do Blue Side:**

Liste apenas 3-5 campeões ou estratégias que o Blue Side precisa priorizar agora, considerando counters aos picks inimigos e meta atual. Seja direto, uma linha por sugestão.`;
    } else if (type === "analysis") {
      // Análise da composição do red side
      systemPrompt = `Você é um analista profissional de League of Legends. Analise a composição do Red Side e forneça insights estratégicos.`;
      
      userPrompt = `Composição Red Side:
Picks: ${redPicks.join(", ") || "Nenhum"}
Bans: ${redBans.join(", ") || "Nenhum"}

Composição adversária (Blue):
Picks: ${bluePicks.join(", ") || "Nenhum"}
Bans: ${blueBans.join(", ") || "Nenhum"}

Analise:
1. Pontos fortes da composição Red
2. Fraquezas e vulnerabilidades
3. Condições de vitória (win conditions)
4. Fase de jogo favorável (early/mid/late)

Seja conciso e direto ao ponto.`;
    } else if (type === "chat") {
      systemPrompt = `Você é um coach profissional de League of Legends especializado em composições de equipe e estratégias. Seja prestativo, direto e forneça conselhos práticos sobre:
- Composições de equipe e sinergias
- Estratégias de jogo (early/mid/late game)
- Counters e matchups
- Postura de jogo e win conditions
- Meta atual e power picks`;

      const historyMessages = conversationHistory?.slice(-6) || [];
      const messages = [
        { role: "system", content: systemPrompt },
        ...historyMessages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage }
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages
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
      const analysis = data.choices?.[0]?.message?.content || "Análise não disponível";

      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const analysis = data.choices?.[0]?.message?.content || "Análise não disponível";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("draft-analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
