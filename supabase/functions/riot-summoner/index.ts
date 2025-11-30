const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY');
const RIOT_AMERICAS_API = 'https://americas.api.riotgames.com';
const RIOT_BR_API = 'https://br1.api.riotgames.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SummonerRequest {
  gameName: string;
  tagLine: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameName, tagLine }: SummonerRequest = await req.json();

    console.log(`Fetching account for ${gameName}#${tagLine}`);

    // Step 1: Get account by Riot ID
    const accountResponse = await fetch(
      `${RIOT_AMERICAS_API}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY!,
        },
      }
    );

    if (!accountResponse.ok) {
      const error = await accountResponse.text();
      console.error('Account API error:', error);
      throw new Error(`Failed to fetch account: ${accountResponse.status}`);
    }

    const accountData = await accountResponse.json();
    const puuid = accountData.puuid;

    console.log(`Found PUUID: ${puuid}`);

    // Step 2: Get summoner data by PUUID
    const summonerResponse = await fetch(
      `${RIOT_BR_API}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY!,
        },
      }
    );

    if (!summonerResponse.ok) {
      const error = await summonerResponse.text();
      console.error('Summoner API error:', error);
      throw new Error(`Failed to fetch summoner: ${summonerResponse.status}`);
    }

    const summonerData = await summonerResponse.json();

    // Step 3: Get ranked data
    const rankedResponse = await fetch(
      `${RIOT_BR_API}/lol/league/v4/entries/by-puuid/${puuid}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY!,
        },
      }
    );

    let rankedData = [];
    if (rankedResponse.ok) {
      rankedData = await rankedResponse.json();
    }

    console.log('Successfully fetched summoner data');

    return new Response(
      JSON.stringify({
        account: accountData,
        summoner: summonerData,
        ranked: rankedData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in riot-summoner function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
