/* Bank Run configuration.
   Leave both values empty to run the local demo (one browser, simulated depositors).
   To play on many phones, fill in the Supabase project URL and its anon (publishable) key,
   after running supabase/schema.sql in that project. The anon key is meant to be public;
   never put the service-role key or the instructor passphrase in this file. */
window.BANK_RUN_CONFIG = {
  supabaseUrl: 'https://hqeemodhepljktpqilhi.supabase.co',
  supabaseAnonKey: 'sb_publishable_qN8xWhKD02i31lxNZvegig_52B8X09e'
};
