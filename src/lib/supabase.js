import { createClient } from "@supabase/supabase-js";

// These are public client credentials. Access is protected by Supabase Auth and RLS.
export const supabase = createClient(
  "https://vqmagozxbfqlvbnfjfbh.supabase.co",
  "sb_publishable_4fNijCqRR-IC6IANtGZJdg__tvaq9Rl"
);
