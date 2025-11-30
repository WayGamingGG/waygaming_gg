const OPGG_MCP_BASE = "https://mcp-api.op.gg/mcp";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChampionPositionsRequest {
  championName: string;
  tier?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { championName, tier = "platinum_plus" }: ChampionPositionsRequest = await req.json();

    console.log(`Fetching positions data for champion: ${championName}, tier: ${tier}`);

    // Call OP.GG MCP API using the lol-champion-positions-data tool
    // JSON-RPC 2.0 format requires jsonrpc, id, method, and params
    const requestBody = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "lol-champion-positions-data",
        arguments: {
          lang: "pt_BR",
          format: "json",
        }
      }
    };

    const response = await fetch(OPGG_MCP_BASE, {
      method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Mcp-Session-Id': 'lovable-session-1',
    },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OP.GG MCP API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OP.GG positions response:', JSON.stringify(data).substring(0, 200));

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in opgg-champion-positions function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
