# OTI-TECH Android App Roadmap

**Last updated:** 2026-10-24  
**Overall status:** Native-feeling discovery app and persistent offline cache are implemented in source; Android preview and device review remain with Hermes  
**Current phase:** Phase 1 foundation and Phase 2 discovery are in progress; native splash configuration and runtime acceptance remain open  
**Roadmap owner:** OTI-TECH project team; update this file as work advances

This is the working build plan for the OTI-TECH mobile app. Agents and contributors should read it before starting mobile work, keep its status current, and record decisions and evidence here. The existing website and API remain the source of truth for the first mobile release.

## Product direction

Build an Android-first app that makes it easy for prospective buyers and clients to discover OTI-TECH properties and projects and contact the business. A later release can add seller self-service. Keep the existing web admin dashboard as the main staff operations tool for now.

### First-release audience and outcomes

- **Buyers and clients:** browse genuine available properties and completed projects, understand the details, and make an enquiry or contact OTI-TECH.
- **Prospective clients:** find construction services and contact the business.
- **Sellers:** seller account and listing workflows are planned after the browse-and-enquire experience is established.

The app must never present illustrative or sample inventory as a real available listing. Public browsing and enquiries should work without requiring an account.

### Proposed technology

**Selected for initial implementation: Expo SDK 58 + React Native + TypeScript**, in the new `mobile/` app directory, using the existing JSON REST API at `/api/v1`. This fits the JavaScript project and leaves a path to iOS if the team chooses to add it later. It does not reuse the current HTML/CSS screens; mobile UI is purpose-built. Revisit before the first store release if Android-only native behavior becomes a requirement.

Choose Kotlin + Jetpack Compose later only if Android-specific native behavior becomes a stronger priority. Capacitor remains an option only if the goal changes to a short web-app validation build.

## Scope

### MVP: customer discovery and contact

1. App launch, branding, accessible navigation, loading/error/empty states.
2. Public property list with practical search and filters supported by the API.
3. Property detail with current status, location, price when available, description, and image gallery.
4. Project portfolio list and details.
5. Enquiry form that creates a record through the API, with clear confirmation and a call/WhatsApp fallback.
6. Share property/project links; open the matching in-app screen through verified Android App Links once domain association is configured.
7. Guest use for all public browsing and contact flows. Optional local-only saved properties may be added if they fit the MVP without adding account friction.

**Optional MVP candidate:** adapt the construction cost estimator from `pages/build-cost.html` after its calculations, assumptions, and mobile behavior are reviewed. Keep it out of the critical path until that review is complete.

### Follow-on: accounts and seller tools

- Sign in and seller registration.
- Seller dashboard showing only the seller's own submitted listings and review status.
- Create/edit a seller listing and upload property photos through the existing media flow.
- Hardened persistent sessions, explicit logout, and server-side refresh-token rotation/revocation before long-lived mobile sign-in is released.

### Later, based on demand

- Cloud-synced favorites and saved searches.
- Price/status alerts and push notifications.
- Map search after the listing data has reliable geographic coordinates and a map provider is selected.
- Staff tools only if mobile staff workflows show a clear need; the web admin dashboard remains in place.

## Existing project capabilities to reuse

The repository currently contains a static HTML/CSS/JavaScript website and an Express API backed by PostgreSQL and Drizzle. The API already has routes for:

- Public properties and projects, including detail lookups.
- Property filters for type, purpose, status, location, and price range; project filters for category, status, location, and year. Both public lists support page/limit pagination (up to 50 per page).
- Public enquiry submission.
- Public contact settings for WhatsApp, phone, and email.
- Authentication, seller registration, and current-user lookup.
- Seller-owned property submission/listing management.
- Presigned image uploads and property/project image records.

Relevant source locations: `js/api.js`, `backend/src/server.js`, `backend/src/routes/properties.js`, `backend/src/routes/projects.js`, `backend/src/routes/enquiries.js`, `backend/src/routes/auth.js`, and `backend/src/routes/media.js`.

The mobile app should consume these API contracts over HTTPS. Reuse API behavior and content; do not embed admin web pages in the app or couple screens to the website DOM. Add API endpoints only for agreed mobile features that the current API cannot support.

The website's services page is currently static and has no public API endpoint. The initial mobile services screen mirrors the four service summaries and features from `pages/services.html`; keep those copies synchronized until a public services-content endpoint is agreed.

## Phases and acceptance criteria

Statuses: **Not started**, **In progress**, **Blocked**, **Complete**. Mark a phase complete only when its acceptance criteria are met and the evidence is recorded in the progress log.

### Phase 0 — Product and technical decisions

**Status: In progress**

Decide and document:

- Whether iOS is a likely follow-on; confirm Expo/React Native or choose Kotlin/Compose.
- MVP screen list, brand assets, supported Android versions/devices, app package ID, and environment naming.
- A working staging API and the source of truth for production inventory/photos.
- Review image URL and storage behavior; verify seller image upload against staging when Phase 3 is scheduled.
- API behavior for property filtering, pagination, status/availability, image URLs, enquiry confirmation, and rate limits.
- Authentication plan before persistent seller sessions. The current refresh route issues stateless JWTs and does not expose logout/revocation; implement server-managed refresh rotation/revocation before production long-lived sessions.
- Privacy policy, contact details, analytics/consent choices, and Play Store ownership/release prerequisites.

**Exit criteria:** decisions are recorded below; staging API is reachable from a device; sample data is clearly separated from publishable inventory; MVP scope is approved.

### Phase 1 — Mobile foundation

**Status: In progress**

- Create the isolated `mobile/` app with a repeatable Android development build.
- Add TypeScript navigation, theme, responsive layouts, shared UI primitives, and app configuration.
- Add development/staging/production API configuration without secrets in source control.
- Build a typed API client with timeouts, safe error mapping, cancellation, and request logging that omits credentials and personal data.
- Add image loading/caching and a lightweight local cache for public content where useful.
- Establish environment setup and build instructions in `mobile/README.md`.

**Exit criteria:** app installs on an emulator and a physical Android device; navigation and API health screen work against staging; no production secrets are bundled.

**Current evidence:** project configuration, explicit EAS development/preview/production environments, an SDK-matched `expo-dev-client` dependency, typed API client with timeout/error handling, a Contact-screen readiness check wired to the backend `/health/ready` route, environment-aware API defaults, a guard that disables enquiry writes against the production API in non-production builds, safe-area layout, first public screens, and launcher/adaptive/monochrome icon assets derived from the website favicon exist under `mobile/`. Development defaults to the Android emulator's local API; preview builds need an explicit non-production API URL before enquiries can be submitted. Public API snapshots now persist under the app document directory, hydrate before browse screens mount, are marked stale after 15 minutes, and are retained for up to 30 days; only public listings, projects, and contact settings are stored. Remote photos use a bounded local cache of 48 images / 80 MB with seven-day refresh. A branded React Native launch view stays visible while that local cache restores. Native Expo splash-plugin configuration remains pending because current npm registry requests fail with `EACCES`. The manifest targets Expo SDK 58 / React Native 0.88. **The installed tree has 468 packages; `expo-doctor` passed 20/20 checks on the baseline, and `npm run typecheck` passes after the current redesign.** Android Studio/SDK paths plus Java/adb tools are absent from the checked paths and PATH. Expo SDK 58 documents Node 22.13 as the minimum and Android SDK 37 for compilation; the machine has Node 26.5. Runtime/build verification remains pending with Hermes.

### Phase 2 — Public discovery MVP

**Status: In progress**

- Build home, property search/list, filters, property details, gallery, projects list/details, services, and contact/enquiry screens.
- Handle loading, no results, API unavailable, offline, stale content, and unavailable-property states.
- Submit enquiries to the API and provide a useful confirmation/fallback.
- Share property/project URLs and handle the website's existing `?slug=` detail URLs. Host verification requires the signed app fingerprint in `/.well-known/assetlinks.json` and remains a release gate.
- Include the cost estimator only after the Phase 0 review.

**Exit criteria:** a guest can complete browse → detail → enquiry on a real device; displayed property status and detail fields come from the API; Android back navigation, TalkBack, system font scaling, small screens, and poor connectivity have usable behavior. Interactive targets must meet Android's recommended 48dp minimum, controls must remain usable at larger text sizes, and important states must not rely on color alone.

**Current evidence:** a mobile dashboard home with a property search action, four quick routes, horizontal property/project collections, a compact app bar, custom bottom tabs, branded launch view, and persistent public-data/photo caching are implemented in source. Existing API-backed property search/filtering, project filters/details, services, contact/enquiry flows, details, galleries, share actions, URL routing, and screen-reader labels remain. Common navigation, action, filter, retry, back, and search controls meet a 48dp target in source; TalkBack, large fonts, contrast, and Android Accessibility Scanner review remain open. Detail pages overlay the active tab, preserving filters and scroll position on Back. Confirmed 404 responses evict cached detail/list content; network errors retain cached content and a stale notice. Website App Link filters are configured, but domain association is not published or verified. The app has not been installed or exercised against the staging API; Android preview and offline-relaunch verification remain with Hermes.

### Phase 3 — Accounts and seller workflow

**Status: Not started**

- Add sign in, seller registration, session restoration, refresh, logout, and expired-session recovery.
- Store refresh credentials using native secure storage backed by Android Keystore; never copy the browser `sessionStorage` approach into the app.
- Add seller-owned listing list/details, create/edit, photo upload, and pending/approved/rejected status.
- Preserve API role checks: sellers can only manage their own listings and must never access buyer enquiries or another seller's data.

**Exit criteria:** authenticated seller flows pass against staging; refresh rotation and logout/revocation work; ownership and role boundaries are verified at the API; failed uploads can be retried without duplicate listing/image records.

### Phase 4 — Beta, release readiness, and Play launch

**Status: Not started**

- Review crashes, startup time, scrolling, image sizes, accessibility, privacy disclosures, permissions, and analytics.
- Verify production API availability, HTTPS, backend authorization for native clients, rate limits, backups, and monitoring.
- Test on a representative device matrix and with slow/interrupted connectivity.
- Produce a signed Android App Bundle, release notes, privacy/support links, store listing assets, and staged rollout plan.
- Run a closed beta and resolve release-blocking issues before public rollout.

**Exit criteria:** release checklist and beta feedback are recorded; install/update paths work; the production app uses verified live content and the correct production API; rollout and rollback owners are named.

### Phase 5 — Improve from usage

**Status: Not started**

Use actual enquiry completion, search behavior, support feedback, and seller demand to prioritize favorites sync, saved searches, alerts, push notifications, maps, and any staff-facing mobile tools. Add new API tables/endpoints and permissions before building features that require persistent user-specific data.

**Exit criteria:** each follow-on feature has a documented user need, API/data design, privacy impact, acceptance criteria, and owner before implementation begins.

## Cross-cutting requirements

- Keep buyer contact details private and enforce role/ownership checks in the backend, not only in the UI.
- Use HTTPS and environment-based API URLs. Do not hardcode credentials, tokens, or private keys.
- Never log passwords, access/refresh tokens, full enquiry messages, or unnecessary personal data.
- Give image content a bounded size and provide resilient loading/error placeholders.
- Be explicit about whether content is live, cached, unavailable, or illustrative.
- Make the app usable across ability levels: keep public browsing and enquiries available without an account, use plain labels and clear recovery messages, expose meaningful names/roles/states to TalkBack, support system font scaling without clipping actions, provide at least 48dp touch targets, and review text/control contrast. Verify key flows with TalkBack and Android Accessibility Scanner before beta.
- Keep the web site and API working while adding mobile code; prefer additive API changes and migrations.
- Record behavior changes, test/build evidence, and unresolved risks in this roadmap.

## Decision log

| Date | Decision | Status | Notes |
| --- | --- | --- | --- |
| 2026-10-23 | Mobile app will start Android-first; customer discovery and contact are the first product slice. | Agreed direction | Captured from project discussion. |
| 2026-10-23 | Use Expo SDK 57 + React Native + TypeScript in `mobile/` for the initial Android implementation. | Superseded before dependency installation | Matches the existing JavaScript project and permits future iOS work; on 2026-10-24 the project baseline was advanced to SDK 58 before the first build. |
| 2026-10-24 | Target Expo SDK 58 / React Native 0.88 / React 19.3 for the initial Android app. | Selected; dependency baseline and typecheck complete; Android build pending | The SDK-matched dependency baseline is installed and `expo-doctor` previously passed 20/20; the current source typechecks. SDK 58 requires Android SDK Platform 37 to compile and targets API 36. Runtime/build verification remains with Hermes. |
| 2026-10-23 | Reuse the website favicon as the starting point for Android launcher, adaptive, and themed monochrome icons. | Implemented, device review pending | Keeps the app mark aligned with the existing OTI-TECH identity; check mask and safe-zone rendering on Android before release. |
| 2026-10-23 | Use EAS Build profiles for repeatable Android development, preview, and Play Store builds. | Configured, first build pending | Internal profiles produce installable APKs; production uses the default app-bundle format. EAS project `@cyberdrag0n/otitech-mobile` and the preview API variable are configured; a stable public staging URL and preview build remain. Hermes owns builds and delivery. |
| 2026-10-23 | Mirror the website's four current service summaries in a native Services screen. | Implemented, copy-sync requirement | There is no services API route; until a content endpoint exists, update `mobile/src/serviceCatalog.ts` together with `pages/services.html`. Service actions preselect the matching enquiry category. |
| 2026-10-23 | Keep the admin dashboard web-first in the initial app release. | Working scope | Revisit only with a defined staff mobile workflow. |
| 2026-10-23 | Separate development, preview, and production API modes and prevent non-production builds from submitting enquiries to the production API. | Implemented in source/config | Development defaults to the local Android emulator API; preview writes require an explicitly configured non-production API; production builds use the production API. The EAS preview URL is configured, but the mock staging tunnel still needs a stable public endpoint before device validation. |
| 2026-10-24 | Shape the customer app around native mobile discovery instead of a website-style landing page. | Implemented in source; device review pending | The home screen now prioritizes search, four quick routes, and horizontal featured collections. A compact OTI-TECH app bar and persistent bottom tabs keep navigation in the app; details use Android Back and hide the tabs. |
| 2026-10-24 | Persist public listings and viewed photos so the app can reopen offline. | Implemented in source; device review pending | Public API snapshots are restored before browse screens mount, become stale after 15 minutes, and expire after 30 days. Public images use a 48-file / 80 MB app-local cache and refresh after seven days. Enquiry form data is not cached. |
| 2026-10-24 | Show OTI-TECH branding while restoring the local cache at launch. | React Native launch view implemented; native splash config pending | The bundled brand mark, background, and progress state display without waiting for the network. `expo-splash-screen` could not be installed while npm registry requests fail; add its SDK 58 plugin and verify the native launch experience in Hermes' preview APK when package access is restored. |

## Immediate handoff checklist

The next contributor should prioritize making the current source buildable and reviewable before adding more MVP features:

1. **Baseline complete; one SDK package remains:** the SDK 58 dependency baseline and lockfile are installed, `expo-doctor` passed 20/20 on the baseline, and `npm run typecheck` passes after this redesign. Current registry requests return `EACCES`, and the offline npm cache has no `expo-splash-screen` metadata (`ENOTCACHED`). Once package access returns, install it with `npx expo install expo-splash-screen`, configure its SDK 58 plugin using the OTI-TECH mark, and refresh the lockfile.
2. ~~Configure the EAS development/preview/production API variables; provision a non-production database and API, add its URL to the preview environment, confirm it serves safe test inventory, and verify `/health/ready` from an Android device.~~ **PARTIAL** — EAS login and project init done (`@cyberdrag0n/otitech-mobile`), preview env var `EXPO_PUBLIC_API_BASE_URL` set. **Mock staging API created** at `C:/Users/workstation/Desktop/otitech/mobile-staging-api` (Express server with test properties, projects, enquiries, settings). Runs on `http://localhost:3001/api/v1`. Cloudflare quick tunnel unstable in background mode on Windows; run `cloudflared tunnel --url http://localhost:3001` in a **foreground terminal** for a stable public URL, then update EAS preview env var.
3. **Done:** EAS account and project are linked as `@cyberdrag0n/otitech-mobile`; confirm `com.otitech.mobile` before the first store release because it remains provisional.
4. **Hermes deployment handoff:** obtain a stable staging URL, set the EAS preview API variable, add the native splash plugin after the package install, and build an internal APK. The prior Windows EAS attempt failed on Git's `file://` protocol; Hermes can use its established deployment path. Do not treat local source work as a preview build.
5. On the preview APK, verify browse → detail → enquiry, filters, pagination, share, Android Back, website detail links, launch splash, and offline relaunch (load data/photos online, close the app, disable network, reopen).
6. Review TalkBack, larger system font sizes, touch targets, contrast, and poor-network behavior; confirm a published privacy policy and support links before beta; record device/build evidence before closing Phases 0–2.

## Current progress

| Item | Status | Evidence / next action |
| --- | --- | --- |
| Roadmap and phase acceptance criteria | Complete | Phase boundaries, exit criteria, decisions, and the ongoing progress log are documented in this file. |
| Framework/platform decision | Complete | Expo SDK 58 + React Native + TypeScript selected for implementation; Android package ID remains provisional. |
| Production inventory and staging API readiness | In progress | **Mock staging API created and running locally on port 3001** with test properties, projects, enquiries, and settings endpoints. Cloudflare tunnel setup attempted but quick tunnels unstable in background mode on Windows. Production API not accessible from this network. |
| Android App Links association | In progress | `app.json` contains website detail URL filters, but no local `.well-known/assetlinks.json` file or signed app fingerprint is available; live domain association also could not be checked from this network-restricted environment. |
| Privacy and release disclosures | In progress | `components/analytics.js` links to `/pages/privacy.html`, but no privacy page exists in the checkout; publish and review the actual policy/support links before beta because the enquiry flow collects contact details. |
| Mobile app foundation and public flow | In progress | `mobile/` now has a compact app bar, bottom-tab navigation, dashboard home, branded cache-hydration launch view, 30-day public-data persistence, and bounded local photo caching alongside the existing discovery, details, services, contact, enquiry, and deep-link flows. Expo SDK 58 dependencies and the lockfile are present; `expo-doctor` passed 20/20 on the baseline and `npm run typecheck` passes after this redesign. Current registry requests fail with `EACCES`, so the native Expo splash plugin could not be installed. Hermes owns the Android preview/build and device review; offline relaunch, splash rendering, and accessibility still need device verification. |

## Progress log

Append a dated entry whenever meaningful implementation, a decision, a blocker, or a verification result changes. Keep earlier entries; do not replace history with only the latest status.

| Date | Update | Evidence / outcome |
| --- | --- | --- |
| 2026-10-23 | Initial Android app roadmap created. | Existing site/API routes reviewed; no mobile app implementation performed yet. |
| 2026-10-23 | Selected Expo SDK 57 + React Native + TypeScript and created the initial mobile app source. | `mobile/` contains API-backed property/project browsing and enquiry screens. Expo scaffold could not be downloaded: `npm ping` to the public registry returned `EACCES`; Android Studio/SDK paths and Java/adb were not found in the usual locations or PATH. Source is not runtime-verified. |
| 2026-10-23 | Added page loading for longer property/project results, share actions, Android URL routing, responsive galleries, and screen-reader headings/alerts. | Matches public API pagination and the website's `property-details.html?slug=` / `project-details.html?slug=` URLs. Asset Links association and on-device verification remain pending. |
| 2026-10-23 | Rechecked build prerequisites and added link-test instructions. | npm registry still returns `EACCES`; app-link filters use the canonical website domains, but `/.well-known/assetlinks.json`, signing fingerprint, dependencies, and Android install are pending. |
| 2026-10-23 | Added a bounded 15-minute in-memory cache for public API responses and a notice when listings are shown from the last loaded session data. | Handles temporary connection loss without silently implying cached availability is current; cache is cleared when the app process ends. |
| 2026-10-23 | Checked mobile request and response contracts against the Express property, project, enquiry, and public settings routes; added screen-reader labels to form inputs and isolated detail screens by slug. | The source field names, pagination envelope, contact settings query, and enquiry payload match the existing API routes. Runtime build and device behavior are still unverified. |
| 2026-10-23 | Added minimum and maximum NGN price filters to property search with positive-number and range validation. | Filters are sent as `minPrice` and `maxPrice`, matching the public properties query schema; inputs remain staged until Search is applied. |
| 2026-10-23 | Added project location search and category/status filters. | Query names and allowed values match the public projects route schema; results remain paginated and cached per filter combination. |
| 2026-10-23 | Checked current mobile build prerequisites and corrected a duplicated JSX accessibility prop found during source review. | `mobile/node_modules` and a mobile lockfile are absent, the npm cache has no required Expo packages, and Android Studio/SDK, Java, and adb are unavailable in the checked locations. A package install and device build cannot be completed from this machine state; source changes remain uncompiled. |
| 2026-10-23 | Added a single-tap reset for property and project filters; applying searches and resetting filters dismiss the keyboard. | Reset restores the default API query while clearing staged location and price inputs. |
| 2026-10-23 | Changed cached detail handling for confirmed 404 responses. | A missing property or project now evicts its cached copy and shows an unavailable message; network and server failures can continue to show cached content with a stale-data notice. |
| 2026-10-23 | Added Android launcher, adaptive, and monochrome themed icon assets from the existing website favicon and wired them into Expo configuration. | `app.json` parsed and each referenced PNG was confirmed at 1024×1024; adaptive and monochrome foregrounds use transparent safe-zone marks and the configured OTI-TECH deep-purple background. Android mask rendering still needs device review. |
| 2026-10-23 | Added an on-demand readiness check to the Contact screen. | Uses the configured API base URL and the existing `/health/ready` contract; reports ready and unavailable responses without sending user data. A staging/device run remains pending. |
| 2026-10-23 | Added a native Services tab and Home entry point with four service summaries and contextual enquiry actions; extracted the static service catalog. | Copy mirrors the existing `pages/services.html` overview in `mobile/src/serviceCatalog.ts`; Real Estate also links to property search. The website has no services API, so copy sync is recorded as a maintenance requirement. |
| 2026-10-23 | Rechecked mobile dependency and Android build prerequisites. | npm registry ping still fails with `EACCES`; `mobile/node_modules`, a mobile lockfile, Android SDK paths, `adb`, Java, and TypeScript CLI remain unavailable. Compilation and device verification are still gated. |
| 2026-10-23 | Added EAS Build profiles for a development-client APK, internal preview APK, and production store build; declared the SDK 57-matched development client. | `package.json` and `eas.json` parse; profile checks confirm installable internal APKs and a production profile. Dependency install, Expo project linkage, account login, staging API, and first cloud build remain pending. |
| 2026-10-23 | Preserved the active tab under property/project details and added keyboard dismissal when opening a detail. | Detail routes render as an overlay and hide the underlying tab from accessibility; returning with Android Back preserves property/project filters and list scroll state. |
| 2026-10-23 | Recheck cached-content age when Android returns the app to the foreground. | The 15-minute freshness timer now uses the original response age after resume, so a paused timer cannot leave old listings labeled fresh; it marks content stale without automatically submitting a network request. |
| 2026-10-23 | Set a measurable accessibility baseline for the customer MVP and enlarge common controls. | Filter chips and action/retry/back/search controls now have 48dp minimum targets; quick links and property/project cards have clearer TalkBack labels. Device review for TalkBack, larger font settings, contrast, and Android Accessibility Scanner remains open. |
| 2026-10-23 | Added a prioritized next-contributor handoff checklist. | The next work is build/runtime validation against staging, package/EAS setup, and accessibility review; no further MVP feature should be called complete until those checks are recorded. |
| 2026-10-23 | Kept paginated-list freshness tied to the first-page refresh. | Loading another page no longer renews the 15-minute age of older results; the original cache timestamp remains in place and the stale notice can still appear on schedule. |
| 2026-10-23 | Recorded the missing public privacy-policy page as a release gate. | The existing analytics link targets `/pages/privacy.html`, but that file is absent; the mobile enquiry form collects name, phone, optional email, and message, so privacy/support links must be published and reviewed before beta. |
| 2026-10-23 | Added project-year search to the Android portfolio filters. | The mobile query now includes the existing API `year` filter, matching the current website's category/status/location/year discovery options; the year is applied with the location search and cleared by Reset. |
| 2026-10-23 | Made enquiry, contact-link, and pagination failures discoverable to TalkBack. | Dynamic error messages now use alert semantics; a device-level announcement check remains pending with the wider accessibility review. |
| 2026-10-23 | Added environment-specific API defaults and guarded enquiry writes in development/preview builds. | Local development defaults to `10.0.2.2:3000`; preview writes require an explicit API URL that is not the production Fly host; the production profile uses the production API. EAS settings and actual API reachability remain unverified until project linkage and staging setup. |
| 2026-10-23 | Statically checked the environment configuration and write-call coverage. | `app.json` and `eas.json` parse; the three EAS profiles select matching environments, and the only app write call is the guarded `/enquiries` submission. TypeScript compilation and an actual build remain pending. |
| 2026-10-23 | Checked whether a local non-production API/database is available. | Backend dependencies exist, but localhost ports 3000 and 5432 are closed; no PostgreSQL service, `psql`, or Docker CLI was found. Do not use the backend environment file until its database target is confirmed non-production. |
| 2026-10-23 | Parsed the mobile TypeScript/TSX sources with the locally available Babel parser. | All six app source files parsed successfully. This checks syntax only; TypeScript typecheck and Expo/Android build remain pending because mobile packages and Android tooling are unavailable. |
| 2026-10-23 | Rechecked npm access before attempting dependency installation. | `npm ping --fetch-timeout=10000 --fetch-retries=0` still returns `EACCES` for `registry.npmjs.org`; mobile packages and a lockfile remain unavailable, so no TypeScript or Android build was attempted. |
| 2026-10-23 | Checked live API and Android release URLs from this environment. | The production readiness GET returned HTTP 000 after a connection failure; the web fetch tool also could not reach the URLs. No local `assetlinks.json` or `pages/privacy.html` exists. This records verification limits and local release gaps, not a production outage diagnosis. |
| 2026-10-23 | Clarified what the Contact-screen readiness check confirms. | Its success state now reports that the configured API is reachable without implying that enquiry submission is enabled in a guarded preview build. |
| 2026-10-23 | Reparsed the Contact screen after the readiness-copy update. | Babel accepted `mobile/src/screens.tsx`; this is a syntax check only and does not replace TypeScript compilation. |
| 2026-10-23 | Checked mobile environment-file hygiene before staging configuration. | `mobile/.gitignore` excludes `.env` and `.env.*` while retaining `.env.example`; no local `mobile/.env` file currently exists. |
| 2026-10-23 | Connected confirmed detail 404s to the related property/project list caches. | A missing detail now evicts all cached list variants for that collection and triggers a refresh in the mounted home/list screen, avoiding a stale card being treated as current after Back. Babel syntax parsing passed; TypeScript/device verification remains pending. |
| 2026-10-23 | Added explicit photo-gallery navigation and position announcements. | Detail galleries now include labeled Previous/Next controls with disabled states and a polite `Photo N of M` announcement; Babel parsed the hooks and screen files, but TalkBack/device behavior remains unverified. |
| 2026-10-23 | Preserved visited tab state across bottom-navigation changes. | Previously visited tabs remain mounted, inactive tabs are removed from touch and accessibility navigation, and switching tabs dismisses the keyboard. Babel parsed `App.tsx`, `hooks.ts`, and `screens.tsx`; scroll restoration, hidden-screen behavior, and memory use need device verification. |
| 2026-10-23 | Expanded property/project TalkBack card summaries. | Property cards now announce purpose, type, status, location, and price; project cards announce status, year or category, and location. Babel parsed all four changed TS/TSX files; TalkBack behavior remains pending device review. |
| 2026-10-23 | Marked property and project detail titles as screen-reader headings. | TalkBack can navigate the core detail title as a heading after opening a listing or portfolio item; source syntax parsing passed, with on-device navigation still pending. |
| 2026-10-23 | Marked asynchronous loading and empty-result messages as polite live regions. | Android screen readers can announce these browse states as they appear; Babel syntax parsing passed, with TalkBack announcement behavior pending device review. |
| 2026-10-24 | Updated the app baseline from Expo SDK 57 to SDK 58 before first dependency installation. | `package.json` now follows the Expo SDK 58 reference/template versions for Expo, React Native, React, TypeScript, the development client, and safe-area context. SDK 58 requires Android SDK Platform 37 to compile and targets API 36. npm access still fails with `EACCES`, so lockfile generation, Expo Doctor, TypeScript compilation, and Android builds remain pending. |
| 2026-10-24 | Removed the React Native 0.88-removed `StatusBar.backgroundColor` prop. | SDK 58's upgrade guide lists this prop as removed; the app root has its own background color, while status bar icon/text style remains set. Babel parsing passed; Android edge-to-edge rendering still requires device review. |
| 2026-10-24 | Retried dependency installation after selecting SDK 58 and checked the registry/cache discrepancy. | The [live npm registry metadata](https://registry.npmjs.org/expo/latest) reports `expo@58.0.17`, but the local npm cache resolves only through `57.0.24`; `npm install` therefore returned `ETARGET`, and a fresh-cache lookup failed with `EACCES`. No `node_modules` or lockfile was created. Restore npm access or use an approved mirror, then run install, SDK alignment, Expo Doctor, typecheck, and Android builds. |
| 2026-10-24 | Confirmed the package-fetch blocker with pnpm and rechecked Android tooling. | `pnpm install` returned `EACCES` for all declared packages and was stopped during its timed retry; no `pnpm-lock.yaml` or `node_modules` was created. `java`, `adb`, Expo CLI, EAS CLI, and TypeScript CLI are unavailable, and checked Android SDK locations/environment variables are empty. Phase 1 and Phase 2 remain blocked until package access and Android build/device capability are restored. |
|| 2026-10-24 | Set the recommended recovery path to an EAS cloud preview APK. | The app already has an internal preview APK profile; use it with a staging `EXPO_PUBLIC_API_BASE_URL` after package access and EAS project setup. This avoids installing Android Studio/SDK for the first phone review; local SDK setup remains optional for local builds/emulators. |
|| 2026-10-24 | **Restored npm registry access; installed mobile dependencies (467 packages), ran `expo install --fix`, `expo-doctor` (20/20 checks pass), and TypeScript typecheck (passes).** | `npm ping` succeeded; `npm install` completed; `npx expo install --fix` reported dependencies up to date; `npx expo-doctor` all 20 checks passed; `npm run typecheck` (tsc --noEmit) passed with zero errors after fixing ScrollView ref types and adding @types/node to tsconfig. Phase 1 advanced from Blocked to In progress. |
|| 2026-10-24 | **Fixed TypeScript compilation errors in screens.tsx and api.ts.** | Added missing `imageFallbackMark`/`imageFallbackText` styles to screens.tsx StyleSheet; corrected ScrollView ref to use `ScrollViewInstance` type from react-native; added `\"types\": [\"node\"]` to tsconfig.json and confirmed @types/node installed, resolving `process` reference errors in api.ts. All six source files now typecheck cleanly. |
|| 2026-10-24 | **EAS login, project init, and preview env var configured.** | `eas login` (device flow) → `eas init --account cyberdrag0n` linked project `@cyberdrag0n/otitech-mobile` (ID: f6f1606b-0159-40c1-92a8-8af1178dd4f1). Set `EXPO_PUBLIC_API_BASE_URL` in preview environment. |
|| 2026-10-24 | **Mock staging API created and running locally.** | Express server at `mobile-staging-api/server.js` with test data for 5 properties, 4 projects, enquiries endpoint, and public settings. Runs on `http://0.0.0.0:3001/api/v1`. Health check `/health/ready` returns ready. Cloudflare quick tunnel (`cloudflared tunnel --url http://localhost:3001`) works in foreground but unstable in background mode on Windows. |
|| 2026-10-24 | **EAS build blocked by Windows git file:// protocol bug.** | `eas build --platform android --profile preview` fails with `git clone file:///... exited with non-zero code: 128`. Known EAS CLI limitation on Windows. Workarounds: (a) build from WSL2, (b) push mobile/ to GitHub remote and build from there, (c) use GitHub Actions for CI/CD builds. |

| 2026-10-24 | Replaced the website-like mobile landing experience with an app discovery shell. | `mobile/App.tsx`, `mobile/src/components.tsx`, and `mobile/src/screens.tsx` now provide a branded launch view, compact app bar, five-tab bottom navigation, dashboard shortcuts, and horizontal property/project rails. Existing detail, enquiry, service, filter, and gallery flows remain wired into the app. `npm run typecheck` passes; Android device review remains open. |
| 2026-10-24 | Added durable offline caching for public data and property/project photos. | `mobile/src/offlineCache.ts`, `mobile/src/cached-image.tsx`, and `mobile/src/hooks.ts` persist public API responses and downloaded photos under the app document directory. Cached data stays available for up to 30 days and is considered fresh for 15 minutes; photo cache is capped at 48 files/80 MB (20 MB per image) and revalidates after 7 days. Enquiry form data is not cached. `expo-file-system@58.0.11` is now a direct dependency. |
| 2026-10-24 | Added a branded React Native launch view and recorded the remaining native splash setup. | The launch view waits for local cache hydration and uses the bundled app branding; app colors are set in `mobile/app.json`. The native Android splash still needs `expo-splash-screen` and its config plugin. Package registry requests returned `EACCES`, and offline installation returned `ENOTCACHED` because its metadata is not cached. `npm run typecheck` passes; no APK or device run was performed, and Hermes owns deployment. |

## Instructions for future agents

1. Read this roadmap and inspect the current working tree before editing. Preserve existing user changes.
2. Work on the current phase and its exit criteria; do not mark future phases complete based on plans.
3. Update the status tables and append a progress-log entry with files changed and evidence after each milestone.
4. Record new product or architecture decisions in the decision log, including date and rationale.
5. Keep app configuration and secrets safe; never print credentials or commit local environment files.
