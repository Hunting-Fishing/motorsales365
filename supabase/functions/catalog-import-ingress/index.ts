import { createHandler } from './handler.mjs';
// GitHub OIDC signature and workflow claims are verified inside the handler.
// This endpoint does not accept an ordinary public Supabase key or end-user JWT.
Deno.serve(createHandler({
 supabaseUrl: Deno.env.get('SUPABASE_URL'),
 secret: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}));
