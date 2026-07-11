import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  profileId: string;
  roleId: string;
  shopId: string;
  password?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the service role key from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email, firstName, lastName, profileId, roleId, shopId, password } = await req.json() as InviteRequest;

    console.log('Processing team member:', { email, firstName, lastName, profileId, hasPassword: !!password });

    // Check if profile already exists - first by ID, then fall back to email
    let { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, email')
      .eq('id', profileId)
      .maybeSingle();

    console.log('Profile lookup by id result:', { existingProfile, profileError });

    if (!existingProfile) {
      const { data: profileByEmail, error: emailLookupError } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, email')
        .ilike('email', email)
        .maybeSingle();

      console.log('Profile lookup by email result:', { profileByEmail, emailLookupError });

      if (emailLookupError) {
        throw emailLookupError;
      }

      if (!profileByEmail) {
        throw new Error('Profile not found for given id or email');
      }

      existingProfile = profileByEmail;
    }

    let authData;
    let authError;

    if (password) {
      // Create user with password directly
      const createResponse = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          profile_id: profileId,
          role_id: roleId,
          shop_id: shopId
        }
      });
      authData = createResponse.data;
      authError = createResponse.error;
      console.log('User created with password');
    } else {
      // Send invitation email using Admin API
      const inviteResponse = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: firstName,
          last_name: lastName,
          profile_id: profileId,
          role_id: roleId,
          shop_id: shopId
        },
        redirectTo: `${req.headers.get('origin')}/auth/callback`
      });
      authData = inviteResponse.data;
      authError = inviteResponse.error;
      console.log('Invitation sent successfully');
    }

    if (authError) {
      console.error('Error with auth operation:', authError);
      throw authError;
    }

    // Link the auth user to the resolved profile
    if (authData.user?.id && existingProfile?.id) {
      const { error: linkError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          user_id: authData.user.id,
          has_auth_account: true,
          invitation_sent_at: new Date().toISOString() 
        })
        .eq('id', existingProfile.id);

      if (linkError) {
        console.error('Error linking profile to auth user:', linkError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        userId: authData.user?.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in invite-team-member function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to send invitation'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
