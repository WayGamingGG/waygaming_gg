const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY');
const RIOT_AMERICAS_API = 'https://americas.api.riotgames.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchesRequest {
  puuid: string;
  count?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { puuid, count = 20 }: MatchesRequest = await req.json();

    console.log(`Fetching matches for PUUID: ${puuid}`);

    // Get match IDs
    const matchIdsResponse = await fetch(
      `${RIOT_AMERICAS_API}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY!,
        },
      }
    );

    if (!matchIdsResponse.ok) {
      const error = await matchIdsResponse.text();
      console.error('Match IDs API error:', error);
      throw new Error(`Failed to fetch match IDs: ${matchIdsResponse.status}`);
    }

    const matchIds: string[] = await matchIdsResponse.json();
    console.log(`Found ${matchIds.length} matches`);

    // Fetch details for each match (limit to avoid rate limits)
    const matchPromises = matchIds.slice(0, 10).map(async (matchId) => {
      const matchResponse = await fetch(
        `${RIOT_AMERICAS_API}/lol/match/v5/matches/${matchId}`,
        {
          headers: {
            'X-Riot-Token': RIOT_API_KEY!,
          },
        }
      );

      if (matchResponse.ok) {
        return await matchResponse.json();
      }
      return null;
    });

    const matches = (await Promise.all(matchPromises)).filter((m) => m !== null);

    console.log(`Successfully fetched ${matches.length} match details`);

    return new Response(
      JSON.stringify({ matches }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in riot-matches function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
