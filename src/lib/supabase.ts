import { createClient } from "@supabase/supabase-js";

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fyfdkzkuboyllkucjpdr.supabase.co";

export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_-V_YNDtaMA1ImzZg9t1Oew_MCqg-M_R";

export const supabase = createClient(supabaseUrl, supabaseKey);
