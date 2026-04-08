# REXFORM IAM

A full-stack Identity and Access Management (IAM) platform built with Next.js, Ory (Kratos/Keto/Hydra), and PostgreSQL. Implements a **Backend-For-Frontend (BFF)** pattern with a **Zero-Trust security architecture**.

## What it does

- Centralized user identity management (registration, login, recovery, profile)
- Fine-grained permission management via Zanzibar-style relation tuples (Ory Keto)
- OAuth2/OIDC provider integration (SimpleLogin, Ory Hydra consent flow)
- Organization and group management with hierarchical roles
- GitLab integration — manage group/project role assignments from IAM
- Matrix/Element integration — provision users, spaces, and rooms via Synapse Admin API
- Auto-provisioning of new users to a default organization on first login
- Comprehensive audit logging for all admin actions

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript |
| Auth (Identity) | Ory Kratos |
| Auth (Authorization) | Ory Keto (Zanzibar model) |
| Auth (OAuth2/OIDC) | Ory Hydra |
| Database | PostgreSQL via Prisma |
| UI | React 19, Tailwind CSS 4, Shadcn UI |
| Forms | React Hook Form + Zod |
| Chat Integration | Matrix/Synapse |
| DevOps | Docker (multi-stage) |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL instance
- Running Ory stack (Kratos, Keto, Hydra) — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your service URLs and secrets

# Run database migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

App runs at `http://localhost:3000`.

### Environment Variables

See [.env.example](.env.example) for all required variables. Key groups:

```bash
# Ory services
ORY_KRATOS_PUBLIC_URL=http://localhost:4433
ORY_KRATOS_ADMIN_URL=http://localhost:4434
ORY_KETO_READ_URL=http://localhost:4466
ORY_KETO_WRITE_URL=http://localhost:4467

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/iam_app

# Matrix (optional)
MATRIX_HOMESERVER_URL=http://localhost:8448
MATRIX_ADMIN_TOKEN=...
```

### Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://your-app.example.com \
  -t rexform-iam .

docker run -p 3000:3000 --env-file .env rexform-iam
```

The container runs Prisma migrations automatically on startup.

## Project Structure

```text
iam-app/
├── app/
│   ├── admin/          # Admin UI (identities, groups, GitLab, Matrix)
│   ├── api/            # BFF API routes
│   │   ├── admin/      # Admin-only endpoints
│   │   ├── auth/       # Auth webhooks (Kratos registration hook)
│   │   ├── dashboard/  # User-facing endpoints
│   │   └── oauth2/     # Hydra consent/login/logout flows
│   ├── auth/           # Self-service auth pages (login, register, recovery)
│   └── dashboard/      # User dashboard
├── lib/
│   ├── services/       # BFF service layer (Kratos, Keto, Matrix, GitLab, etc.)
│   ├── keto/           # Ory Keto client + permission namespace definitions
│   ├── middleware/     # Auth/authz helpers (requireAuth, requireAdmin)
│   ├── types/          # Shared TypeScript interfaces
│   └── db.ts           # Prisma singleton
├── components/
│   ├── layout/         # App shell (sidebars, nav)
│   └── ui/             # Shadcn primitives
├── prisma/
│   ├── schema.prisma   # Data models
│   └── migrations/     # Migration history
├── docs/               # Architecture and integration guides
├── scripts/            # Utility scripts (bulk provisioning, Keto health check)
└── middleware.ts        # Next.js edge middleware (session + route protection)
```

## Permission Model

Permissions use Ory Keto's Zanzibar-style relation tuples across these namespaces:

| Namespace | Objects | Relations |
| --- | --- | --- |
| `GlobalRole` | `"admin"` | `is_admin`, `members` |
| `Organization` | org ID | `owners`, `admins`, `members`, `viewers` |
| `Group` | group ID | `org`, `admins`, `members` |
| `GitlabGroup` / `GitlabProject` | resource ID | `owner`, `maintainer`, `developer`, `reporter`, `guest` |
| `MatrixOrg` / `MatrixSpace` / `MatrixRoom` | resource ID | `matrix_admin`, `moderator`, `support`, `member`, `viewer` |

Permission checks are cached in memory (5-minute TTL for grants, 30-second TTL for denials).

## API Routes

### Admin (requires `GlobalRole:admin`)

| Method | Path | Description |
| --- | --- | --- |
| `GET/POST` | `/api/admin/identities` | List / create identities |
| `GET/PUT/DELETE` | `/api/admin/identities/[id]` | Manage a single identity |
| `GET` | `/api/admin/identities/[id]/access` | Get user's permissions |
| `GET/POST` | `/api/admin/groups` | List / create groups |
| `GET/POST/DELETE` | `/api/admin/groups/[id]/members` | Manage group members |
| `GET/POST` | `/api/admin/gitlab/groups` | GitLab group management |
| `POST` | `/api/admin/gitlab/roles` | Assign GitLab roles |
| `GET/POST` | `/api/admin/matrix/orgs` | Matrix org management |
| `POST` | `/api/admin/matrix/roles` | Assign Matrix roles |
| `POST` | `/api/admin/provision` | Manually provision user(s) |

### Auth

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/registration-hook` | Kratos post-registration webhook |
| `POST` | `/api/auth/complete-profile` | Profile completion after OIDC registration |

### OAuth2

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/oauth2/login` | Hydra login endpoint |
| `GET` | `/api/oauth2/consent` | Hydra consent endpoint |
| `GET` | `/api/oauth2/logout` | Hydra logout endpoint |

## Security Model

Every protected request follows this flow:

```
Request → Edge Middleware (session check) → API Route (requireAuth/requireAdmin) → Permission Check → Business Logic
```

- **Fail closed**: unauthorized requests return 403, never leak data
- **No client-side secrets**: all Ory admin API calls happen server-side in API routes
- **Admin guard**: `requireAdmin()` checks `GlobalRole:admin` membership before processing any admin API request

See [docs/ZERO-TRUST.md](docs/ZERO-TRUST.md) and [docs/BFF-PATTERN.md](docs/BFF-PATTERN.md) for details.

## Adding New Features

Follow the Zero-Trust pattern for every new API route:

```typescript
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/errors";

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);           // auth + authz check
    const data = await yourService.get();  // call service layer, never raw HTTP
    return createSuccessResponse(data);
  });
}
```

## Scripts

```bash
npm run dev           # Dev server (port 3000)
npm run build         # Production build (includes prisma generate)
npm run lint          # ESLint

npx prisma migrate dev          # Run migrations locally
npx prisma studio               # Browse database

./scripts/keto-probe.sh                    # Check Keto health
./scripts/provision-existing-users.sh      # Bulk provision all unprovisioned users
```

## Documentation

| Doc | Description |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and component overview |
| [docs/BFF-PATTERN.md](docs/BFF-PATTERN.md) | BFF implementation details and patterns |
| [docs/ZERO-TRUST.md](docs/ZERO-TRUST.md) | Zero-Trust security principles |
| [docs/AUTO-PROVISIONING.md](docs/AUTO-PROVISIONING.md) | User auto-provisioning system |
| [docs/GITLAB-ACCESS.md](docs/GITLAB-ACCESS.md) | GitLab integration guide |
| [docs/KRATOS-OIDC-SIMPLELOGIN.md](docs/KRATOS-OIDC-SIMPLELOGIN.md) | OIDC / SimpleLogin setup |
| [docs/OAUTH2-TOKEN-USAGE.md](docs/OAUTH2-TOKEN-USAGE.md) | OAuth2 token handling |
| [docs/HYDRA-OAUTH2-SETUP.md](docs/HYDRA-OAUTH2-SETUP.md) | Ory Hydra configuration |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and fixes |
| [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) | Detailed folder structure reference |
| [docs/QUICK-REFERENCE.md](docs/QUICK-REFERENCE.md) | Quick reference for common tasks |
