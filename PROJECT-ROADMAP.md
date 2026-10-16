# OTI-TECH Project Roadmap

This is the working structure we will follow as the website grows from a static landing page into a full property and construction platform.

## Target project tree

```text
otitech/
├── index.html                 # Public homepage (current)
├── css/
│   └── style.css              # Global site styles (current)
├── img/                       # Optimised public images
├── js/
│   ├── main.js                # Navigation, shared UI behaviour
│   ├── properties.js          # Property search and listing rendering
│   └── contact.js              # Enquiry form validation and submission
├── pages/                     # Additional public pages
│   ├── properties.html
│   ├── property-details.html
│   ├── projects.html
│   └── about.html
├── components/                # Reusable UI fragments/templates
├── backend/                   # Server/API application
│   ├── src/
│   │   ├── server.js
│   │   ├── config/             # Environment and database configuration
│   │   ├── routes/             # API route definitions
│   │   ├── controllers/        # Request handling
│   │   ├── models/             # Database models
│   │   ├── middleware/         # Auth, validation, errors, rate limiting
│   │   └── services/           # Email, WhatsApp, file storage integrations
│   ├── migrations/             # Database schema changes
│   ├── seeds/                  # Development/sample data
│   ├── tests/
│   └── package.json
├── admin/                      # Protected staff dashboard
│   ├── index.html
│   ├── css/
│   └── js/
├── seller/                     # Seller registration and listing workspace
│   ├── index.html
│   ├── dashboard.html
│   ├── css/
│   └── js/
├── database/
│   ├── schema.sql              # Reference schema
│   └── README.md
├── uploads/                    # Local development only; use cloud storage in production
├── .env.example                # Required environment variable names (no secrets)
├── .gitignore
└── README.md
```

## Build order

1. **Foundation:** clean the current HTML/CSS, fix responsive behaviour, accessibility, metadata, image optimisation, and browser/mobile testing.
2. **Frontend structure:** move inline scripts into `js/`, create reusable components, and add dedicated property, project, and detail pages.
3. **Backend foundation:** choose the server stack, add environment configuration, API conventions, validation, error handling, logging, and security middleware.
4. **Database:** create tables for users, properties, property images, projects, enquiries, and site settings; add migrations and seed data.
5. **Real estate functionality:** connect filters and search to the API, add property detail pages, availability/status, enquiries, and image galleries.
6. **Enquiries and communication:** persist contact submissions, send email notifications, and connect WhatsApp links using one centrally configured business number.
7. **Admin dashboard:** secure staff login, property CRUD, image management, project management, enquiry status, and basic analytics.
8. **Production readiness:** validation, backups, access control, rate limiting, monitoring, SEO, analytics, deployment, and user acceptance testing.

## Delivery status

| Phase | Status | Scope and evidence |
| --- | --- | --- |
| 1. Foundation | **Complete — 2026-09-01** | Public homepage hardened for desktop and mobile; added semantic landmarks, keyboard-safe navigation, motion preferences, metadata, WebP image assets, safe contact fallbacks, and repeatable browser smoke checks. The static site does not persist enquiries; JavaScript hands enquiries to WhatsApp while the no-JavaScript fallback offers direct WhatsApp/email contact. |
| 2. Frontend Structure | **Complete — 2026-09-23** | Shared components extracted: navigation, footer, WhatsApp button, contact handoff, property/project cards. All 7 pages (Home, Services, Properties, Property Details, Projects, Project Details, About, Contact) use shared modules. Properties page has advanced filtering (type, purpose, status, location, price) with 9 sample listings and status indicators. Property Details and Project Details pages have full specs, galleries, WhatsApp enquiry handoff. Navigation audit completed — consistent links, spacing, hover states, mobile menu across all pages. All smoke tests pass. |
| 3. Backend Foundation | **Complete — 2026-09-23** | Express API with PostgreSQL + Drizzle ORM. 7 tables (users, properties, property_images, projects, project_images, enquiries, site_settings). JWT auth with access/refresh tokens, role-based access. REST routes for properties, projects, enquiries, auth, settings, health. Zod validation, Helmet/CORS/rate-limiting, Pino logging. Migration & seed scripts with sample data. |
| 4. Database & UI Polish | **Complete — 2026-09-23** | Enhanced all page hero sections with consistent design: gradient overlay, kicker badge, large responsive headlines, CTA button groups (primary + WhatsApp), arrow hover animations. Unified `.page-hero` base styles with responsive breakpoints. All 5 pages (Services, Properties, Projects, About, Contact) updated. Smoke tests pass. |
| 5. Real Estate Functionality | **Complete — 2026-09-23** | API client (`js/api.js`) with endpoints for properties, projects, enquiries, auth, settings. Frontend modules (`properties.js`, `projects.js`) fetch from backend with graceful fallback to local sample data. Property/project detail pages fetch from API. Image gallery component (`components/image-gallery.js`) with thumbnail navigation, keyboard support. Responsive listing grid (1/2/3/4 columns). All 5 smoke tests pass. |
| 6. Enquiries & Communication | **Complete — 2026-09-23** | Contact form submits to `/api/v1/enquiries` with DB persistence + email notification (Nodemailer). Graceful fallback to WhatsApp on API failure. WhatsApp business number centralized in `site_settings` table, fetched via public `/api/v1/settings/public` endpoint. Admin routes for enquiry management (list, get, update status/assignee/notes, delete). Contact form initiates API submission then opens WhatsApp as confirmation. All 5 smoke tests pass. |
| 7. Admin Dashboard | **Implemented - pending desktop/mobile review** | Staff sign-in with access/refresh token renewal; admin-only account provisioning; admin/staff/viewer permissions; property and project create/edit/delete, draft/publish controls, image gallery management, enquiry status/notes, administrator site settings, dashboard totals, seller accounts and listing review, and moderator enquiry assignment. Seller submissions remain unpublished until an admin approves them. Sellers cannot access buyers or enquiries; moderators see only assigned enquiries; admins see the full inbox. Staff and viewer accounts have no enquiry access. |
| 8. Production Readiness | **In progress** | Added a public-file-only frontend image, local Compose startup with automatic schema setup and health checks, same-origin API proxying, generated sitemap/robots metadata, and corrected image publishing permissions/tags plus Fly release migrations. Still pending: Phase 7 desktop/mobile review, production secrets and registry access, durable upload storage, backups, monitoring, and hosted acceptance checks. |

### Phase 2 acceptance criteria

- Shared navigation, footer, contact handoff, and page metadata are no longer duplicated across public pages.
- The Properties page supports client-side filters against clearly labelled sample data; no placeholder listing is presented as live inventory.
- A Property Details page has an accessible image gallery, status, location, description, and enquiry handoff.
- Projects and About have usable mobile and desktop layouts.
- Every new page passes local reference checks and browser smoke/viewport testing before the backend phase starts.

## Current database entities

- `users` — admin, staff, viewer, moderator, and seller accounts.
- `properties` — title, type, purpose, location, price, description, status, optional seller owner, and review status.
- `property_images` — image URL, sort order, alt text, property relation.
- `projects` — project title, category, description, cover image, status.
- `enquiries` — contact details, requested service/property, message, status, optional moderator assignment, and timestamps.
- `site_settings` — phone, email, WhatsApp number, social links, company details.

## Working rule

We will complete and verify one phase before moving to the next. Secrets will stay in environment variables, database changes will use migrations, and every user-facing feature will have a usable mobile and desktop state.

## Seller workflow acceptance criteria

- A seller can register, sign in, submit a property, upload listing photos, and see review status for their own submissions.
- Seller-created listings and resubmissions remain unpublished until an admin approves them; approval publishes the listing and rejection leaves it private.
- A seller cannot read or manage another seller's listings, access enquiries, or retrieve buyer contact details.
- Admins can assign enquiries to active moderators. Moderators can read and update only enquiries assigned to them; staff and viewer accounts cannot access the enquiry API.
- Existing approved listings stay public after migration, and existing unpublished listings remain private.
