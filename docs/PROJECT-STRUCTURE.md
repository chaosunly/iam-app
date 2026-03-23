# Project Structure

This document describes the folder structure of the `iam-app` Next.js application, the rationale behind each decision, and the rules to follow when adding new code.

---

## Directory Overview

```
iam-app/
├── app/                        # Next.js App Router — routes live here
│   ├── (public)/               # (future) public/marketing pages
│   ├── admin/                  # Protected: /admin/* routes
│   │   ├── _components/        # Admin-only components (not publicly routable)
│   │   ├── gitlab/
│   │   ├── groups/
│   │   ├── identities/
│   │   ├── organization/
│   │   ├── permissions/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/                    # API routes (BFF layer)
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── debug/
│   │   └── oauth2/
│   ├── auth/                   # Auth flow pages: /auth/*
│   │   ├── _components/        # Auth-only shared components (private folder)
│   │   ├── callback/
│   │   ├── complete-profile/
│   │   ├── login/
│   │   ├── logout/
│   │   ├── recovery/
│   │   ├── registration/
│   │   ├── settings/
│   │   └── verification/
│   ├── dashboard/              # Protected: /dashboard/* routes
│   │   ├── _components/        # Dashboard-only components (private folder)
│   │   ├── groups/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home /
│
├── components/                 # Shared components used across multiple routes
│   ├── layout/                 # App-shell components (sidebars, header)
│   │   ├── admin-sidebar.tsx
│   │   ├── page-header.tsx
│   │   └── user-sidebar.tsx
│   └── ui/                     # Shadcn UI primitives (auto-generated, do not edit)
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
│
├── lib/                        # Non-UI business logic and utilities
│   ├── auth/                   # Auth helpers (OAuth2, Ory client setup)
│   │   └── oauth2.ts
│   ├── keto/                   # Ory Keto authorization client + namespaces
│   │   ├── client.ts           # Raw Keto HTTP client (CRUD for relation tuples)
│   │   ├── index.ts            # Re-exports everything from client.ts
│   │   └── namespaces/         # Permission namespace type definitions
│   │       ├── gitlabGroup.ts
│   │       ├── gitlabProject.ts
│   │       ├── globalRole.ts
│   │       ├── group.ts
│   │       ├── organization.ts
│   │       ├── user.ts
│   │       └── index.ts
│   ├── middleware/             # Next.js middleware helpers
│   │   ├── auth.middleware.ts
│   │   └── index.ts
│   ├── services/               # BFF service layer (one file per domain)
│   │   ├── audit.service.ts
│   │   ├── auto-provision.service.ts
│   │   ├── gitlab.service.ts
│   │   ├── group.service.ts
│   │   ├── keto.service.ts
│   │   ├── kratos.service.ts
│   │   ├── organization.service.ts
│   │   ├── permission.service.ts
│   │   ├── simplelogin-sync.service.ts
│   │   ├── user-setup.service.ts
│   │   └── index.ts
│   ├── types/                  # Shared TypeScript types
│   │   ├── api.ts
│   │   └── index.ts
│   ├── admin-auth.ts           # Admin access guard (server-side)
│   ├── db.ts                   # Prisma client singleton
│   ├── errors.ts               # Custom error classes
│   ├── ory-client.ts           # Ory SDK client init
│   ├── simplelogin-auth.ts     # SimpleLogin OAuth2 helpers
│   └── utils.ts                # General utilities (cn, etc.)
│
├── prisma/                     # Database schema and migrations
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
│
├── public/                     # Static assets
├── docs/                       # Project documentation
├── scripts/                    # Build/utility scripts
└── middleware.ts               # Next.js edge middleware (auth routing)
```

---

## Key Conventions

### 1. Private Folders (`_components/`)

Any folder prefixed with `_` is a **private folder** — Next.js excludes it from routing entirely.

```
app/auth/_components/oauth2-login.tsx   ✅ not a route
app/auth/components/oauth2-login.tsx    ❌ ambiguous — looks like a route segment
```

**Rule:** Route-specific components that are not shared across sections go in a `_components/` folder beside their route. This makes it immediately clear they belong to that route only and can't be navigated to directly.

---

### 2. `components/layout/` vs `components/ui/`

| Folder | Contains | Edited by |
|---|---|---|
| `components/ui/` | Shadcn primitives (Button, Card, etc.) | `shadcn` CLI only |
| `components/layout/` | App-shell components (sidebars, breadcrumb header) | Team |

**Why separate?** `ui/` components are stateless, generic primitives. `layout/` components are opinionated — they know about app routes, navigation structure, and session state. Mixing them in the same folder makes it harder to see at a glance what is "design system" vs "application chrome".

**Rule:** Never put app-aware components in `components/ui/`. Never manually edit files in `components/ui/` — regenerate them with `shadcn add` instead.

---

### 3. `lib/keto/` structure

```
lib/keto/
  client.ts       ← raw HTTP client for the Keto API
  index.ts        ← re-exports from client.ts (keep imports short: @/lib/keto)
  namespaces/     ← TypeScript types for each permission namespace
```

**Before:** `lib/keto.ts` (flat file) sat next to `lib/keto/` (folder), which caused confusion about where to add new namespace types vs new client helpers.

**After:** `lib/keto/client.ts` is the implementation. `lib/keto/index.ts` is the public surface. All existing imports (`@/lib/keto`, `"./keto"`, `"../keto"`) continue to resolve to `index.ts` with zero changes required.

**Rule:**
- Add new Keto API helpers to `lib/keto/client.ts`
- Add new permission namespace definitions to `lib/keto/namespaces/`
- Import Keto utilities via `@/lib/keto` (never import `client.ts` directly from outside `lib/keto/`)

---

### 4. Service Layer (`lib/services/`)

Each file owns one domain. The `index.ts` barrel re-exports selectively from all services.

```
lib/services/
  kratos.service.ts       # identity CRUD (Ory Kratos)
  keto.service.ts         # permission checks (Ory Keto)
  permission.service.ts   # cached, high-level permission helpers
  audit.service.ts        # security event logging
  group.service.ts        # group management
  organization.service.ts # org management
  gitlab.service.ts       # GitLab role assignments
  user-setup.service.ts   # new user onboarding
  auto-provision.service.ts
  simplelogin-sync.service.ts
  index.ts                # barrel — explicit named re-exports only
```

**Rule:** API routes and page server components import from `@/lib/services` (the barrel), not directly from individual service files. This keeps the coupling surface narrow and makes it easy to rename or split services later.

---

### 5. Where to put a new component

Use this decision tree:

```
Is it a Shadcn primitive?
  └─ Yes → components/ui/  (generated by CLI)

Is it used in more than one route section (admin + dashboard, or auth + dashboard, etc.)?
  └─ Yes → components/layout/  (if it's app-shell/navigation)
         → components/          (if it's a generic shared component)

Is it only used within one route and its children?
  └─ Yes → app/<route>/_components/<name>.tsx
```

---

### 6. API Routes follow the BFF pattern

All `app/api/` routes are a **Backend for Frontend** — they exist solely to serve this UI. They must:

- Call services from `lib/services/`, not external APIs directly
- Validate session/permissions before doing anything
- Never expose raw Keto or Kratos responses to the client without sanitisation

See [BFF-PATTERN.md](./BFF-PATTERN.md) for full details.

---

## What Changed (Refactor Summary — March 2026)

| Before | After | Reason |
|---|---|---|
| `components/admin-sidebar.tsx` | `components/layout/admin-sidebar.tsx` | Separate UI primitives from app-shell components |
| `components/user-sidebar.tsx` | `components/layout/user-sidebar.tsx` | Same |
| `components/page-header.tsx` | `components/layout/page-header.tsx` | Same |
| `app/auth/components/oauth2-login.tsx` | `app/auth/_components/oauth2-login.tsx` | Use Next.js private folder convention |
| `app/dashboard/logout-button.tsx` | `app/dashboard/_components/logout-button.tsx` | Keep route-private components out of route root |
| `lib/keto.ts` | `lib/keto/client.ts` + `lib/keto/index.ts` | Unify flat file and namespace folder under one directory |

All existing import paths continue to work — no consumer files were broken by this refactor.
