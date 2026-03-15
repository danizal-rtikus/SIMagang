import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Buat client dengan Auth Header pemanggil
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Validasi Pemanggil
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verifikasi Otorisasi: Apakah Pemanggil adalah Admin?
    const { data: profile, error: profileError } = await supabaseClient
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Forbidden: Only admins can perform this action');
    }

    // Pemanggil valid, Admin dikonfirmasi!
    // Inisialisasi Klien Admin (Service Role) untuk eksekusi tindakan berisiko
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { action, payload } = await req.json();

    let resultData = null;

    if (action === 'createUser') {
      const { email, password, full_name, identifier, role } = payload;
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (authError) throw authError;

      if (authData.user) {
        const { error: insertError } = await supabaseAdmin.from('users_profile').insert([{
          id: authData.user.id,
          full_name,
          identifier,
          role
        }]);
        if (insertError) throw insertError;
        resultData = authData.user;
      }

    } else if (action === 'updateUser') {
      const { userId, email, password } = payload;
      let updates = {};
      if (email) updates.email = email;
      if (password) updates.password = password;

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
      if (authError) throw authError;
      resultData = authData.user;

    } else if (action === 'deleteUser') {
      const { userId } = payload;
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) throw authError;
      resultData = authData;
      
    } else {
      throw new Error('Unknown action');
    }

    return new Response(JSON.stringify({ success: true, data: resultData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
