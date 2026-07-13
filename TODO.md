# TODO
- [ ] Add root endpoint `/` (GET/HEAD) to API server to prevent Render startup probe 404
- [ ] Rebuild and redeploy to confirm Render health/startup check passes

- [ ] ONE-TIME: migrate local SQLite `phishguard.db` into Render Postgres
      - Ensure Render env var `DATABASE_URL` is set (Postgres)
      - Run (locally or via Render one-off):
        - node scripts/migrate-sqlite-to-postgres.mjs


