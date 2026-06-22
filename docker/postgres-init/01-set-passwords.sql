-- Set Supabase service-role passwords to match POSTGRES_PASSWORD.
-- The supabase/postgres image creates these roles but leaves their passwords
-- unset. GoTrue connects as supabase_auth_admin; PostgREST connects as
-- authenticator. Both need the password set before they can start.
\set pgpass `echo "$POSTGRES_PASSWORD"`
ALTER USER authenticator       WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
