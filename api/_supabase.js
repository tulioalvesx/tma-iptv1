// api/_supabase.js
// Server-side Supabase client (use Service Role key).
// Never expose SUPABASE_SERVICE_ROLE_KEY on the client.

const { createClient } = require('@supabase/supabase-js');

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: (...args) => fetch(...args) },
  });
}

module.exports = { getSupabaseServer };
