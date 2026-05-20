# Supabase schema

This folder contains the canonical SQL schema for the project: `schema.sql`.

To apply the schema locally or to a Postgres-compatible database, set `DATABASE_URL` in your environment and run:

```
pnpm run db:apply
```

The project includes a convenience script `scripts/applySchema.js` which executes `supabase/schema.sql` against the `DATABASE_URL`.

Notes:

- For Supabase projects you can also paste the SQL into the Supabase SQL Editor.
- Keep your service role key and `DATABASE_URL` secret.
