# Talos Admin Page — Design Spec

**Date:** 2026-06-10
**Status:** Approved

## Overview

Merge the existing Talos overview page and key list into a single `/admin/talos` page. Replace the broken "Open Talos Admin" link with a functional admin UI. Introduce inline-expandable table rows so key details and revoke are accessible without a separate detail page.

## Route Changes

| Route | Before | After |
| --- | --- | --- |
| `/admin/talos` | Health card + broken "Open Admin" card | Merged page: header + key table |
| `/admin/talos/keys` | Standalone key list | **Deleted** — add redirect → `/admin/talos` |
| `/admin/talos/keys/new` | Create form | Kept — redirect target changes to `/admin/talos` |
| `/admin/talos/keys/[id]` | Key detail page | **Deleted** — replaced by inline row expand |

## Merged `/admin/talos` Page

### Layout

- **Header row:** "Talos API Keys" title (h1) + health badge on the left; "+ Create Key" button (links to `/admin/talos/keys/new`) on the right.
- **Health badge:** small pill — green dot + "Healthy" when `GET /health/ready` returns 200; red dot + "Unreachable" on error. Fetched server-side (existing `getTalosHealthReady()`), no client polling.
- **Table:** below the header, full width, bordered.

### Table

Each row is collapsed by default and shows:

- **Name** (font-weight 500)
- **Status badge** — `Active` (green) or `Expired` (red), derived from `expires_at`: null or future → Active, past → Expired.

Clicking a row toggles an inline expanded section beneath it. Only one row may be expanded at a time — opening a second row collapses the previous one.

**Expanded row content:**

- ID — truncated to ~12 chars + copy-to-clipboard button
- Note — shown if present, otherwise omitted
- Created — relative date (e.g. "2 days ago")
- Expires — relative date, or "Never" if null
- **Revoke** button — destructive, requires a confirm dialog ("Revoke this key? This cannot be undone."). On confirm: `DELETE /api/admin/talos/admin/api-keys/:id`, then reload the list.

**Empty state:** centred `KeyRound` icon + "No API keys yet" text + "Create your first key" button linking to `/admin/talos/keys/new`.

**Loading state:** skeleton rows (3×) while the initial fetch is in flight.

### Data Fetching

Client component (`"use client"`). Fetches `GET /api/admin/talos/admin/api-keys?limit=100` on mount. No pagination for now — 100 keys is sufficient.

Status derivation is pure client-side: `expires_at === null || new Date(expires_at) > new Date()` → Active, otherwise Expired.

## `/admin/talos/keys/new` — Create Form

No structural changes. Two updates only:

1. After creation + "Done" click, redirect to `/admin/talos` instead of `/admin/talos/keys`.
2. After successful creation with no secret in the response, also redirect to `/admin/talos`.

## Files to Delete

- `app/admin/talos/keys/key-list.tsx`
- `app/admin/talos/keys/page.tsx`
- `app/admin/talos/keys/[id]/key-detail.tsx`
- `app/admin/talos/keys/[id]/page.tsx`

Replace `app/admin/talos/keys/page.tsx` content with a single `redirect('/admin/talos')` call (Next.js App Router `redirect()`) to handle any bookmarked or hardcoded links gracefully.

## Files to Modify

- `app/admin/talos/page.tsx` — rewrite as the merged page (server component shell with health fetch + client `TalosKeyTable` component)
- `app/admin/talos/keys/new/create-key-form.tsx` — update redirect target
- `app/admin/talos/keys/new/page.tsx` — no change needed

## New Component

**`app/admin/talos/key-table.tsx`** — `"use client"` component.

Props: none (fetches its own data).

Responsibilities:

- Fetch and hold key list state
- Track which row ID is expanded (`expandedId: string | null`)
- Render table with expand/collapse
- Handle revoke (fetch + reload)

Extracted from the existing `TalosKeyList` in `keys/key-list.tsx`, with expandable rows added and the separate detail page link removed.

## What Does Not Change

- Auth/permission checks in `app/admin/talos/page.tsx` — kept as-is
- All API routes under `app/api/admin/talos/` — no changes
- `lib/services/talos.service.ts` — no changes
- `/admin/talos/keys/new` page structure — no changes except redirect target
