# Friday Bible Study (FBS)

A full-stack, real-time web app for small groups to share **prayer requests**, **praises**, **photos/videos**, **events**, and a **contact roster**—with an admin portal for lightweight moderation and group email workflows.

> **Status:** Production-ready (finalized).  
> **Owner:** One Guy Productions (OGP).  
> **Copyright:** © 2025 One Guy Productions. All rights reserved.

---

![Friday Bible Study Logo](https://www.fridaybiblestudy.org/bible-study-banner.webp)

## 🌐 Live Site
🔗 [https://fridaybiblestudy.org](https://fridaybiblestudy.org)

---

## Table of Contents

- [Why This Project Exists](#why-this-project-exists)
- [What the App Does (Purpose)](#what-the-app-does-purpose)
- [How People Use It](#how-people-use-it)
    - [Classic Users](#classic-users)
    - [Admins](#admins)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
    - [Monorepo Layout](#monorepo-layout)
    - [Frontend (Client)](#frontend-client)
    - [Backend (Server)](#backend-server)
    - [Database](#database)
    - [Realtime](#realtime)
    - [Email](#email)
    - [Security Abuse Prevention](#security--abuse-prevention)
    - [Styling System](#styling-system)
- [Data Model (High-Level)](#data-model-high-level)
- [Getting Started (Local Development)](#getting-started-local-development)
    - [Prerequisites](#prerequisites)
    - [Environment Variables](#environment-variables)
    - [Install Run](#install--run)
- [Build Deploy - Render.com](#build-deploy-rendercom)
    - [Render Service Layout](#render-service-layout)
    - [Persistent Disk Uploads](#persistent-disk--uploads)
    - [Build Order](#build-order)
- [Quality Conventions](#quality-conventions)
- [Accessibility Performance](#accessibility-performance)
- [Planned / Coming Soon](#planned--coming-soon)
- [Troubleshooting](#troubleshooting)
- [Changelog (Highlights)](#changelog-highlights)
- [License](#license)
- [About One Guy Productions (OGP)](#about-one-guy-productions-ogp)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

---

## Why This Project Exists

Small groups and Bible studies tend to “live” across text threads, email chains, and scattered photo albums. **Friday Bible Study (FBS)** centralizes that into one secure, simple workspace so your group can:

- Share **prayer requests** and **praises** with updates across time.
- Attach **photos/videos** tied to those prayers.
- Keep an up-to-date **roster** (name, spouse, email, phone, address).
- Coordinate **events** and attendance.
- Receive lightweight **email digests** and updates without social-media bloat.

The goal is *low-friction community tooling* that feels tailored to a real group, not a generic enterprise platform.

---

## What the App Does (Purpose)

FBS is a **group-first** tracker for prayers, praises, and events—anchored by a **contact roster**. It emphasizes:

- **History:** Each prayer has a timeline of updates.
- **Clarity:** Items are categorized (e.g., _prayer_, _long-term/salvation_, _pregnancy/birth_) and searchable.
- **Dignity:** Admin tooling is minimal, transparent, and designed to help—not control.
- **Speed:** Realtime UI so people see updates as they happen.
- **Email sanity:** Periodic digests and notifications—respecting user pause/unpause preferences.

---

## How People Use It

### Classic Users

- **Sign in** and land on a simple board interface.
- **Post a prayer** (with title, description, category).
- Add **updates** over time—progress, medical notes, answered prayer, etc.
- **Attach media** (photos/videos) to prayers and updates.
- **Move** a prayer to **Praise** when it’s answered; the full history goes with it.
- **Search/Filter** by category, status, and query.
- Browse **Events**, open an **event modal**, and see times/locations.
- Keep the **roster** accurate: edit your own info (name, phone, email, street, city, state, spouse).

### Admins

- **Admin portal** to curate: filter, search, move cards between boards.
- Add or edit **any roster field** (including adding new users).
- Manage **email pause/unpause** per person.
- **Moderate attachments** (Admin Media Bin pattern) and tidy up duplicates.
- Trigger or preview **digests** and notices (implementation varies by environment).
- Access **archived** items when needed.

---

## Key Features

- **Prayer & Praise boards** with categories and full update history.
- **Praise move** preserves all associated updates and media.
- **Search sort** across prayers/praises (category, status, recency).
- **Attachments**: photos/videos with optional captions and user metadata.
- **Events**: list + modal for details. (Maps autocomplete on the roadmap.)
- **Roster**: self-service profile updates; admin can add/edit anyone.
- **Admin controls**: filters, sorting, status moves, email controls (pause/unpause).
- **Realtime**: socket-driven UI updates when items change.
- **Email**: digests, welcomes, event notices—via transactional email provider.
- **Responsive UI**: mobile-first, desktop-enhanced (sticky right rail on XL, etc.).
- **Theming**: polished light/dark with custom tokens and accessible contrasts.
- **Security**: reCAPTCHA Enterprise gatekeeping on sensitive routes.
- **Deployable**: designed for Render.com with a persistent disk for uploads.

---

## Architecture Overview

### Monorepo Layout

```
root/
├─ Client/                # React + Vite + TypeScript app
│  ├─ src/
│  │  ├─ components/      # UI building blocks (buttons, cards, tables, modals)
│  │  ├─ pages/           # Route-level pages (Boards, Praises, Events, Admin, etc.)
│  │  ├─ jsx/             # Larger view components
│  │  ├─ stores/          # Zustand stores (board, admin, comments, socket, etc.)
│  │  ├─ helpers/         # API helpers, HTTP, formatting, board logic
│  │  ├─ lib/             # 3rd-party wrappers (Google Maps loader, etc.)
│  │  ├─ modals/          # Modal components (Lightbox, EventModal, etc.)
│  │  ├─ index.css        # Tailwind v4 + custom CSS variables (theme tokens)
│  │  └─ main.tsx         # App bootstrap
│  └─ vite.config.ts
└─ Server/                # Node + Express (TypeScript)
   ├─ src/
   │  ├─ routes/          # REST endpoints (auth, prayers, updates, roster, events, photos)
   │  ├─ controllers/     # Request handlers (thin)
   │  ├─ services/        # Business logic (prayers, emails, recaptcha, events, etc.)
   │  ├─ middleware/      # reCAPTCHA, auth guards, error handling
   │  ├─ sockets/         # Socket.IO event wiring (typed events)
   │  ├─ db/              # Database access (queries, migrations/seeds if applicable)
   │  └─ utils/           # Shared helpers, types, ServiceOk/ServiceErr pattern
   └─ index.ts
```

> The exact filenames can vary by commit; see the repo for the latest authoritative structure.

### Frontend (Client)

- **React + Vite + TypeScript**
- **Zustand** for client state stores (e.g., `useBoardStore`, `useAdminStore`, `useCommentsStore`, etc.)
- **Socket.IO client** for realtime updates
- **Tailwind CSS v4** with **custom CSS variables** (see `src/index.css`) and a shared styling contract:
    - Page shell: `min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]`
    - Container: `mx-auto max-w-3xl px-6 py-14 grid gap-10`
    - Card: `rounded-2xl border bg-[var(--theme-surface)] border-[var(--theme-border)] p-6` + `box-shadow: 0 10px 30px var(--theme-shadow)`
    - Links: `text-[var(--theme-link)] hover:text-[var(--theme-link-hover)]` with dotted underline
    - Buttons: `bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)]` + focus rings
- **Lucide React** icons for a consistent visual language
- **Lightbox** for media viewing
- **Event modals** with keyboard a11y (ESC to close)
- **Google Maps loader** wrapper (planned production usage for event location autocomplete)
- **Fetch** API (no axios), central HTTP helpers (`api`, `apiRaw`), and gentle error handling

### Backend (Server)

- **Node.js + Express**
- **TypeScript** throughout
- **PostgreSQL** driver + query layer (SQL)
- **Express middleware**:
    - **reCAPTCHA Enterprise** verification middleware (configurable strictness)
    - Session/authentication plumbing (cookie-based; details depend on deployment)
    - File uploads middleware for photos/videos (implementation detail can vary)
    - Error handling that **avoids `throw new Error`**, favoring graceful `ServiceOk/ServiceErr` patterns
- **Socket.IO** server broadcasting typed events:
    - `prayer:created`, `prayer:updated`, `update:created`, movement across boards, etc.
- **Email service** integration (e.g., Resend) for transactional emails:
    - welcome, digest, event notices, optional BCC/audit flows

### Database

- **PostgreSQL** schema modeled for:
    - `users` (roster info including spouseName and address fields)
    - `prayers` (title, description, category, status)
    - `updates` (chronological notes attached to a prayer)
    - `attachments` (photos/videos linked to prayers/updates)
    - `comments` and `comment_reads` (if your board UX uses read-tracking)
    - `groups` `group_members` (multi-group ready)
    - `events` (title, times, optional location string; future: structured address)
    - `otp_tokens` (for secure flows)
- **Categories:** `prayer`, `long-term/salvation`, `pregnancy/birth` (sortable/filterable)
- **Statuses:** `active`, `praise`, `archived`

> ERD diagrams and SQL migrations live in the repo. See `/Server/src/db/*` or `/Server/db/*` depending on the commit.

### Realtime

- **Socket.IO** emits on CRUD actions so the UI updates instantly for all connected users
- **Optimistic UI** in client stores, with reconciliation when server confirms
- **Event enum** shared client/server for safety where practical

### Email

- **Resend** (or similar) is used for transactional sends
- Addresses such as `group@…`, `admin@…`, `prayers@…`, `praises@…`, `weekly-digest@…` are supported by configuration
- **Pause/Unpause** email per roster member is built-in
- **Weekly Digest** batches last week’s activity (admin-tunable)

### Security & Abuse Prevention

- **reCAPTCHA Enterprise** integration with middleware to score requests
    - Route patterns can be whitelisted/guarded via a safe regex strategy
    - Failing assessments can be soft-denied in dev and strict-denied in prod
- **Session cookies**; CSRF risk minimized by same-origin deployment strategy
- **No nested ternaries** and **no `throw new Error`** in code—favor explicit error objects and safe fallbacks
- **Server-side validation** for key inputs (categories, statuses, pagination bounds)
- **Role checks** (admin vs. classic)

### Styling System

All styling adheres to the **tokenized** design system in `Client/src/index.css`, including light/dark palettes. **Never hardcode hex in components**—always reference CSS variables:

- `--theme-bg`, `--theme-surface`, `--theme-text`, `--theme-border`, `--theme-card`, `--theme-button`, `--theme-button-hover`, `--theme-text-white`, `--theme-link`, `--theme-link-hover`, `--theme-focus`, `--theme-shadow`, etc.

The UI is **mobile-first**, with **desktop enhancements** (e.g., right-rail dock at `min-width: 1280px`).

---

## Data Model (High-Level)

**Users / Roster**
- Fields: `name`, `email`, `phone`, `addressStreet`, `addressCity`, `addressState`, `addressZip`, `spouseName`, `emailPaused`
- Admins can add/edit anyone; users can edit their own record

**Prayers**
- `title`, `description`, `category` (`prayer`, `long-term/salvation`, `pregnancy/birth`)
- `status`: `active` → `praise` → `archived` (movements preserve history)
- `author` (user association), `groupId` (optional for multi-group)
- **Updates**: time-stamped notes; **Attachments**: photos/videos
- **Searchable** and **sortable**

**Events**
- `title`, optional `description`, `startsAt`, optional `endsAt`, `location` (text for now)
- Future: structured place IDs via Google Maps Places

**Photos / Videos**
- Uploaded and stored on a **persistent disk** (cloud)
- Optional captions and author metadata

**Comments Reads**
- When enabled, read receipts can be tracked per-user per-thread

---

## Getting Started (Local Development)

### Prerequisites

- **Node.js 20.x**
- **PostgreSQL 16+**
- **npm** (project uses npm lockfiles; yarn/pnpm not required)
- (Optional) **pgAdmin** to view/manage the database

### Environment Variables

Create two files:

- `Client/.env`
- `Server/.env`

**Client/.env (example)**
```
VITE_API_BASE=/api
VITE_RECAPTCHA_SITE_KEY=__your_recaptcha_enterprise_site_key__
VITE_GOOGLE_MAPS_API_KEY=__your_google_maps_js_key__
# optional: "weekly" or "beta" (loader fallback is handled)
VITE_GOOGLE_MAPS_VERSION=weekly
```

**Server/.env (example)**
```
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgres://USER:PASS@127.0.0.1:5432/friday_bible_study

# Sessions
SESSION_SECRET=__change_me__

# Email (Resend or other provider)
EMAIL_PROVIDER=resend
RESEND_API_KEY=__key__

# reCAPTCHA Enterprise
RECAPTCHA_PROJECT_ID=__gcp_project_id__
RECAPTCHA_SITE_KEY=__site_key__
RECAPTCHA_API_KEY=__api_key__
RECAPTCHA_MIN_SCORE=0.6

# Uploads Disks
UPLOADS_DIR=./uploads  # in dev; Render will mount a disk path in prod
```

> Names here are representative. Check the repo for the exact variable names your version uses.

### Install & Run

From the **root** of the repo:

```bash
# 1) Install client and server deps
cd Client && npm install
cd ../Server && npm install
cd ..

# 2) Start in two terminals (or use a process manager of your choice)

# Terminal A — Server
cd Server
npm run dev       # e.g., ts-node-dev / nodemon; serves API at http://localhost:4000

# Terminal B — Client
cd Client
npm run dev       # Vite dev server at http://localhost:5173
```

If your server and client run on the same domain in production, the dev client typically proxies `/api` to the server. Check `vite.config.ts` for the dev proxy settings.

---

## Build Deploy (Render.com)

### Render Service Layout

A common setup:

- **Web Service (Server)** — Node 22.x, listens on `$PORT`, serves `/api` and the built client (optional)
- **Static Site or Build Step (Client)** — Builds the Vite app and places artifacts where the Server can serve them, or deploys as a separate static site
- **PostgreSQL** — Managed Postgres instance
- **Persistent Disk** — Mounted to the Server (e.g., `/var/data/uploads`) for attachments

### Persistent Disk Uploads

- Configure a **Persistent Disk** on the Server service
- Point `UPLOADS_DIR` (or the equivalent in your repo) to the mount path
- Ensure the uploads middleware writes to that path and that the path exists at boot

### Build Order

Typical approach:

1. **Install Server deps**
2. **Install Client deps** and `npm run build` (produces `/dist`)
3. Copy **Client `/dist`** into a location the Server can serve (or host separately as a static site)
4. **Run DB migrations/seeds** (if your repo includes a script)
5. **Start** the Server

> Because monorepos vary, check your Render **Build Command** and **Start Command** in the service settings.

---

## Quality Conventions

- **TypeScript everywhere** with strict types and DTOs
- **SonarQube** friendly patterns (e.g., avoiding high cognitive complexity)
- **No nested ternaries**
- **Never** use `throw new Error`; prefer `ServiceOk/ServiceErr` results and always **fail gracefully**
- **ESLint** + formatters as configured in the repo
- **Fetch API** only (no axios)
- **Socket events** typed and documented where shared across client/server
- **CSS tokens** only—**no hardcoded hex** in component code
- **React**: prefer **async/await** over `.then().catch()` chains in UI code for readability

---

## Accessibility Performance

- **Keyboard** accessible modals (ESC to close; focus management patterns)
- **Reduced motion** friendly transitions (CSS respects OS settings)
- **Image optimizations** where possible; defer heavy media
- **Server pagination** for list views; debounced text search
- **ReCAPTCHA** reduces bot load and abuse
- **Realtime** updates scoped by group where practical to minimize chatter

---

## Planned / Coming Soon

- **Google Maps Places Autocomplete** on Event location fields  
  (structured addresses + place IDs; graceful fallback to plain text)
- **Email Switchboard**  
  Central, declarative routing of system emails by purpose (digests, welcomes, events)
- **Advanced Search**  
  Full-text search across prayer bodies and updates
- **Audit Log**  
  Admin-visible list of significant actions (moves, edits, deletes)
- **Photo Captions Notes**  
  More robust per-attachment metadata
- **Bible Reading Tools**  
  Improved Bible navigation, VOTD, and reading plans
- **Internationalization (i18n)**  
  Foundational work for additional locales

---

## Troubleshooting

- **Render build fails after lockfile changes**  
  Rebuild both Client and Server; ensure lockfiles are consistent and committed.
- **Prayers not moving live between boards**  
  Verify Socket.IO events are wired on both sides and stores reconcile on `*_updated` events.
- **Uploads missing in prod**  
  Confirm `UPLOADS_DIR` points to the mounted disk path and that the process has write permissions.
- **reCAPTCHA blocking valid users**  
  Lower `RECAPTCHA_MIN_SCORE` slightly for prod or whitelist specific low-risk routes; keep strict checks on form endpoints.
- **Map autocomplete not appearing**  
  Ensure `VITE_GOOGLE_MAPS_API_KEY` is valid; if the `PlaceAutocompleteElement` is missing on `weekly`, the app’s loader falls back to `beta`.

---

## Changelog (Highlights)

- Added **roster fields**: spouseName, address components
- Introduced **email pause/unpause** toggle and UI icons (Pause/Play)
- Reworked **Admin Portal**: filters, sorting, live board moves
- Created **Admin Media Bin** pattern for photo housekeeping
- Implemented **weekly digest** with send controls
- Strengthened **reCAPTCHA Enterprise** guard and route pattern parsing
- Adopted unified **design tokens** Tailwind v4 setup

---

## License

**Proprietary – One Guy Productions (OGP).**  
Unless a separate LICENSE file is present in the repository, all rights are reserved. Contact OGP for licensing inquiries.

---

## About One Guy Productions (OGP)

**One Guy Productions** is a boutique software studio focused on pragmatic, beautifully designed tools for small communities and teams. FBS reflects OGP’s belief that **thoughtful, human-centered software** can make small groups feel more connected without the noise of big social platforms.

- **Mission:** Ship small, sharp tools that respect people’s time and attention.
- **Values:** Clarity, kindness, performance, and maintainability.

---

## Contact

> Replace the bracketed placeholders with your actual info before distributing externally.

- **Website:** [https://www.oneguyproductions.com](https://www.oneguyproductions.com)
- **Email:** [info@oneguyproductions.com](mailto:info@oneguyproductions.com)
- **Support:** [admin@oneguyproductions.com](mailto:admin@oneguyproductions.com)
- **GitHub:** [https://github.com/nathangreen1632](https://github.com/nathangreen1632)

For in-app email identities (example):
- `group@yourdomain.com`
- `admin@yourdomain.com`
- `prayers@yourdomain.com`
- `praises@yourdomain.com`
- `weekly-digest@yourdomain.com`

---

## Acknowledgments

- The Friday Bible Study community for shaping real-world requirements.
- Open-source libraries and their maintainers (React, Vite, Tailwind, Zustand, Socket.IO, Lucide, etc.).
- Render.com for a developer-friendly deployment workflow.

---

### Appendix: Style Guide Snapshot

Use these **exact** patterns in React components:

- **Page shell:**  
  `min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]`

- **Container:**  
  `mx-auto max-w-3xl px-6 py-14 grid gap-10`

- **Card:**  
  `rounded-2xl border bg-[var(--theme-surface)] border-[var(--theme-border)] p-6`  
  plus `box-shadow: 0 10px 30px var(--theme-shadow)`

- **Link:**  
  `underline decoration-dotted text-[var(--theme-link)] hover:text-[var(--theme-link-hover)]`

- **Button:**  
  `inline-flex rounded-xl px-4 py-2 font-semibold bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--theme-focus)] focus-visible:ring-offset-[var(--theme-surface)]`

> **Never** use nested ternaries or `throw new Error`. Handle errors gracefully with fallbacks.  
> **Never** hardcode color hex values in components—use the CSS variables defined in `index.css`.

---

**End of README**
