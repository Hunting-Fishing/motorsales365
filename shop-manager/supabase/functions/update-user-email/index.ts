import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, newEmail } = await req.json();

    if (!userId || !newEmail) {
      return new Response(
        JSON.stringify({ error: 'userId and newEmail are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Updating auth email for user:', userId, 'to:', newEmail);

    // First, check if the email is already in use by another user
    const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (checkError) {
      console.error('Error checking existing users:', checkError);
      throw new Error('Failed to verify email availability');
    }

    const emailInUse = existingUsers.users.find(
      user => user.email?.toLowerCase() === newEmail.toLowerCase() && user.id !== userId
    );

    if (emailInUse) {
      return new Response(
        JSON.stringify({ error: 'This email is already in use by another account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update auth.users email using Admin API with proper flags
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        email: newEmail,
        email_confirm: true, // Mark email as confirmed
        ban_duration: 'none' // Ensure user is not banned
      }
    );

    if (authError) {
      console.error('Auth update error:', authError);
      
      // Provide more specific error messages
      if (authError.message.includes('email')) {
        throw new Error('Invalid email format or email update not allowed');
      }
      throw new Error(`Failed to update email: ${authError.message}`);
    }

    console.log('Auth email updated successfully');

    // Update profiles table to keep in sync
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        email: newEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Don't throw - auth update succeeded, just log the profile error
    } else {
      console.log('Profile email updated successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email updated successfully',
        user: authData.user
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error updating email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error updating user' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
