import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://gokprabzwmxdvxevgxbj.supabase.co';

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_G0Jeq1-68TShWEXQ5J4jkQ_rJrHajtr';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
