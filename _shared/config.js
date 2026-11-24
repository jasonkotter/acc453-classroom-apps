/* Shared configuration for every classroom app.
   Leave both values empty to run the local demos (one browser, simulated students).
   To play on phones, fill in the Supabase project URL and its anon (publishable) key, after
   running _shared/schema.sql in that project. The anon key is meant to be public; never put
   the service-role key or the instructor passphrase in this file.
   Add ?demo=1 to any app's address to force the local demo even when these are filled in. */
window.CLASSROOM_CONFIG = {
  supabaseUrl: 'https://hqeemodhepljktpqilhi.supabase.co',
  supabaseAnonKey: 'sb_publishable_qN8xWhKD02i31lxNZvegig_52B8X09e'
};
