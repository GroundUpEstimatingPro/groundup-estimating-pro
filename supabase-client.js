import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://nykeurolaxqfznbnhppt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0dvqPLGKQBN4uP4t_LMC6w_RjN8LSRf";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
