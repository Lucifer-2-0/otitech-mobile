# OTI-TECH

OTI-TECH is a property and construction website with a public portfolio, PostgreSQL-backed API, and staff dashboard. The current implementation status and build sequence are in [PROJECT-ROADMAP.md](PROJECT-ROADMAP.md).

## Local setup

Requirements: Node.js 20 or later and PostgreSQL.

1. Create a local PostgreSQL database named `otitech` (or choose another name in the environment file).
2. Copy `.env.example` to `backend/.env`. Set the database connection, two unique JWT secrets of at least 32 characters, an administrator email, and a unique administrator password of at least 12 characters.
3. Install dependencies from the project root:

   ```powershell
   npm run install:all
   ```

4. Create the tables and initial account/content:

   ```powershell
   npm run backend:migrate
   npm run backend:seed
   ```

5. Run the API and static site in separate terminals:

   ```powershell
   npm run backend:dev
   ```

   ```powershell
   npm run preview
   ```

Open `http://localhost:4173/` for the public site and `http://localhost:4173/admin/` for the dashboard. The local preview connects to the API at port 3000. For another host or deployment, set a `meta name="otitech-api-base"` value on the page or route `/api/v1` through the same origin.

The seed command creates the first administrator from `ADMIN_EMAIL`, `ADMIN_FULL_NAME`, and `ADMIN_PASSWORD`; it does not print or set a built-in password. The dashboard supports property and project editing, publishing, image gallery management, enquiry follow-up, and site contact settings. Uploaded images are converted to WebP and stored under the ignored `uploads/` directory.

## Containerized local setup

Requirements: Docker Desktop or Docker Engine with the Compose plugin.

1. Copy `.env.example` to `backend/.env`, then set the JWT secrets and administrator credentials as described above.
2. Start PostgreSQL, the API, and the Nginx site:

   ```powershell
   docker compose up --build -d
   ```

   Compose waits for PostgreSQL, applies the database schema, and then starts the API. PostgreSQL data stays in a named volume.

3. Create the first administrator and sample content:

   ```powershell
   docker compose exec backend npm run seed
   ```

4. Open `http://localhost:4173/` for the site and `http://localhost:4173/admin/` for the dashboard. Nginx proxies `/api/` to the API. PostgreSQL and the API bind to localhost only.

Compose credentials and settings are for local development. The frontend image copies only the public site directories and generated sitemap files; it does not copy the backend, local uploads, or environment files. Production Fly deployments require the GitHub `FLY_API_TOKEN`, Fly secrets for the database and JWT keys, and registry access for the GHCR images. The backend Fly release command applies the schema before the new app version starts. CI currently publishes images from `main` and `develop`, but only deploys production from `main`; no staging target is configured.

## Sitemap

Regenerate `sitemap.xml` and update the sitemap line in `robots.txt` after changing public page URLs. Set `SITE_URL` in the shell when the canonical host differs from `https://otitech.com`:

```powershell
$env:SITE_URL = "https://example.com"
npm run generate:sitemap
Remove-Item Env:SITE_URL
```

## Browser smoke checks

The existing Phase 1 smoke suite is available with:

```powershell
npm run test:smoke
```

The admin and backend changes are not covered by that suite yet.
