import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user making the request is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (rolesError || !roles) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()

    // Delete related records that have foreign key constraints to auth.users
    // Delete missions created by this user (as coach)
    await supabaseClient.from('missions').delete().eq('coach_id', userId)
    
    // Delete mission_responses for this user (as player)
    await supabaseClient.from('mission_responses').delete().eq('player_id', userId)
    
    // Delete evaluations where user is coach or player
    await supabaseClient.from('evaluations').delete().eq('coach_id', userId)
    await supabaseClient.from('evaluations').delete().eq('player_id', userId)
    
    // Delete evolution_evaluations
    await supabaseClient.from('evolution_evaluations').delete().eq('evaluator_id', userId)
    await supabaseClient.from('evolution_evaluations').delete().eq('player_id', userId)
    
    // Delete messages
    await supabaseClient.from('messages').delete().eq('sender_id', userId)
    await supabaseClient.from('messages').delete().eq('recipient_id', userId)
    
    // Delete events created by this user
    await supabaseClient.from('event_responses').delete().eq('user_id', userId)
    await supabaseClient.from('events').delete().eq('created_by', userId)
    
    // Delete contracts
    await supabaseClient.from('contracts').delete().eq('player_id', userId)
    await supabaseClient.from('contracts').delete().eq('created_by', userId)
    
    // Delete way point assignments
    await supabaseClient.from('way_point_assignments').delete().eq('player_id', userId)
    await supabaseClient.from('way_point_assignments').delete().eq('assigned_by', userId)
    
    // Delete monthly evaluation summary
    await supabaseClient.from('monthly_evaluation_summary').delete().eq('player_id', userId)
    
    // Delete user roles
    await supabaseClient.from('user_roles').delete().eq('user_id', userId)
    
    // Delete profile
    await supabaseClient.from('profiles').delete().eq('id', userId)

    // Finally delete the user from auth
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
