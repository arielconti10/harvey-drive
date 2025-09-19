# HarveyDrive — Data Room MVP

A polished, end‑to‑end virtual **Data Room** MVP inspired by Google Drive / Box.

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase (Auth + DB), TanStack Query, Zustand, Tailwind, shadcn/ui.  
**Live demo:** https://harvey-drive.vercel.app  
**Screenshots:** <img width="1711" height="810" alt="image" src="https://github.com/user-attachments/assets/4ee57632-f9c7-45e0-8ba7-751a5813e1e8" /><img width="3456" height="1900" alt="dashboard-screenshot" src="https://github.com/user-attachments/assets/3e1f9751-acd5-43eb-b498-405e0fec9f21" />


---

## 1) Requirement Coverage

| Area | What was built | Where |
|---|---|---|
| **Datarooms (CRUD)** | Create, list, rename, delete; per‑owner scoping | UI: `components/dashboard/*` · API: `app/api/datarooms/*` |
| **Folders (CRUD + nesting)** | Create nested folders; list & breadcrumbs; rename; delete (subtree) | UI: `components/dashboard/file-*.tsx` · API: `app/api/folders/*` |
| **Files (CRUD)** | Upload (≥ PDF), list, rename, move, delete; duplicate names auto‑suffix ` (n)` | UI: `components/dashboard/file-*.tsx` · API: `app/api/files/*` |
| **File preview** | Inline viewers for **PDF**, **image**, **audio**, **video**, **text/code**, **Office (embed)**; unsupported → download fallback | `components/viewers/*` (dynamic imports) |
| **Sharing (optional)** | Public link with optional expiry (`/shared/[token]`) | UI: `components/sharing/*` · API: `app/api/files/share`, `app/shared/[token]` |
| **Edge cases** | Duplicate names on **upload and rename**, 50MB size cap, secure `window.open`, sandboxed iframes, robust modal layout | `app/api/files/*`, `components/viewers/*` |

---

## 2) Quick Start

### Prerequisites
- Node **≥ 20.10**, pnpm **≥ 8**
- Supabase project (URL + anon key)
- (Production only) Vercel project with **Vercel Blob** enabled

### Install
```bash
pnpm install
```

### Environment
Create **`.env.local`**:
```ini
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
```

### Database (Supabase)
Run the SQL files in **`/scripts`** in order:

```
001_create_database_schema.sql
002_create_profile_trigger.sql
003_execute_schema_setup.sql
004_fix_rls_policies.sql
005_fix_infinite_recursion.sql
006_reset_rls.sql
```

These create tables (`profiles`, `datarooms`, `folders`, `files`, `file_shares`), enable RLS, and wire foreign keys & cascades.

> **Test user:** Create one in Supabase Auth (email/password). You’ll sign in from the app.

### Start
```bash
pnpm dev
```
Open **http://localhost:3000** → Sign up / Log in → Dashboard.

---

## 3) Deploy (Vercel)

1. Push the repo to GitHub and import in **Vercel**.  
2. Set the env vars above in Vercel **Project Settings → Environment Variables**.  
3. Ensure **Vercel Blob** is enabled; uploads will use Blob in production and local filesystem (`/public/uploads`) in dev.  
4. Deploy. Your hosted URL becomes your **Live demo**.

---

## 4) How to Use (Manual QA Checklist)


1. **Create a dataroom** (left sidebar).  
2. **Create a nested folder** (e.g., `/Contracts/NDA`). Breadcrumbs update.  
3. **Upload files** (PDF/images/videos/audio/text/code).  
   - Upload the same filename twice → second becomes `name (1).ext`.  
4. **Rename** a file/folder. If conflict, duplicate‑safe behavior applies.  
5. **Move** a file into a subfolder.  
6. **Preview** a PDF (toolbar shows *Page 1 of N*, zoom/rotate/reset).  
   - Image/video/audio/text/code previews render. Office docs open via the online viewer.  
   - Unsupported type → download/open fallback message.  
7. **Share** a file via public link (optional); open `/shared/[token]`.  
8. **Delete** a folder with children → subtree removed.

---

## 5) Architecture

### Frontend
- **App Router** pages in `app/`, server components for layout + data hydration.  
- **Viewers** in `components/viewers/*` are **client‑only** and loaded with `next/dynamic({ ssr:false })`.  
- **PDF** uses `react-pdf` with the worker configured once (see `pdf-viewer-inner.tsx`).  
- **Dialogs** use shadcn/ui; modal body uses a **two‑row grid** (`header` + `content`) so headers remain fixed; content gets `min-h-0 min-w-0 overflow-hidden` for predictable scrolling.

### Data & State
- **TanStack Query** for server data (`/lib/hooks/use-*`). 30s `staleTime`, optimistic updates on CRUD, targeted invalidation.  
- **Zustand** UI store in `/lib/store/ui.ts` (current dataroom/folder, selection, view mode, upload panel).  
- **SSR prefetch** for initial dashboard (see `app/dashboard/page.tsx`).

### API (Next.js route handlers)
- Under `app/api/**`: each route **auth‑checks first** and returns JSON with HTTP codes (no redirects).  
- **Files**:  
  - `POST /api/files/upload` → accepts a single file; 50MB cap; allowed types configured in `/lib/constants/files.ts`; duplicate‑safe naming in the current scope.  
  - `PATCH /api/files/rename`, `/move`  
  - `DELETE /api/files/delete` (removes Blob on prod or local file in dev)  
  - `GET /api/files/list` supports folder filter and scoped search.  
- **Folders**: create, rename (conflict check), list (by parent), delete (subtree).  
- **Datarooms**: CRUD per owner.  
- **Share**: `POST /api/files/share` → create public link; `GET /api/shared/[token]` → resolve shared file.

### Data model (simplified)
```
profiles(id, email, full_name, avatar_url, ...)
datarooms(id, name, owner_id, created_at, updated_at)
folders(id, name, parent_id, dataroom_id, owner_id, created_at, updated_at)
files(id, name, original_name, size, mime_type, blob_url, folder_id, dataroom_id, owner_id, is_public, created_at, updated_at)
file_shares(id, file_id, shared_with_id, shared_by_id, permission, share_token, expires_at, created_at)
```

---

## 6) Design & Accessibility

- shadcn/ui components themed via Tailwind tokens in `app/globals.css`.  
- **Icon-only buttons** have `aria-label`; dynamic counters (e.g., PDF page label) use `aria-live="polite"`.  
- Keyboard shortcuts in viewers (arrows to paginate, `Ctrl/⌘` + `+/-/0` to zoom/reset, `R` to rotate).  
- Responsive layout; 

---

## 7) Security & Privacy

- All external opens: `window.open(url, "_blank", "noopener,noreferrer")`.  
- Embeds (Office) use `sandbox` + `referrerPolicy="no-referrer"`.  
- Supabase **RLS** ensures users only see their own datarooms/folders/files.  
- Shared links are explicit, time‑bound (optional expiry).

---

## 8) Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Typecheck + production build |
| `pnpm start` | Run the production build (port 3000) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
