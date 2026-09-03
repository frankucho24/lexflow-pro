import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en lexflow/.env");
}

export const supabase = createClient(url, anonKey);

export async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}
