const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY');
const RIOT_BR_API = 'https://br1.api.riotgames.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MasteryRequest {
  puuid: string;
  top?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { puuid, top }: MasteryRequest = await req.json();

    console.log(`Fetching champion mastery for PUUID: ${puuid}`);

    const endpoint = top 
      ? `${RIOT_BR_API}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${top}`
      : `${RIOT_BR_API}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`;

    const masteryResponse = await fetch(endpoint, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY!,
      },
    });

    if (!masteryResponse.ok) {
      const error = await masteryResponse.text();
      console.error('Champion Mastery API error:', error);
      throw new Error(`Failed to fetch champion mastery: ${masteryResponse.status}`);
    }

    const masteryData = await masteryResponse.json();
    console.log(`Successfully fetched mastery for ${masteryData.length} champions`);

    return new Response(
      JSON.stringify({ mastery: masteryData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in riot-champion-mastery function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
