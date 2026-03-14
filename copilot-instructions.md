---
name: Astro_CRM Workspace Instructions
description: |
  Use these instructions whenever you edit or extend the CRM so Copilot stays aligned with the stack, routing model, and the places you need to touch for every new feature.
applyTo: "**"
---

## Architecture At-a-Glance
- **Backend**: `backend/src/server.ts` boots Express, initializes SQLite via `database/db.ts`, and runs the V3/shop migrations before listening on `http://localhost:3001`.
- **Routing**: Each feature lives in `backend/src/routes/*.ts`, and the server mounts them under `/api/<feature>` (see `customers`, `purchases`, `campaigns`, `analytics`, etc.). Authentication is JWT-based, with only `/api/auth`, `/api/shop/storefront`, `/api/shop/validate-coupon`, and `/api/health` public.
- **Frontend**: Vite + React + Tailwind. `frontend/src/App.tsx` wires React Router, `frontend/src/components/Layout.tsx` wraps authenticated pages, and new pages belong under `frontend/src/pages/` and are exposed in the layout/nav.
- **HTTP client**: `frontend/src/services/api.ts` centralizes every backend call; update it whenever you add, rename or remark endpoints.
- **AI surface**: `frontend/src/components/AIAssistant.tsx` (injects the `aiService` calls) and the backend `ai.ts`/`aihelper.ts` pair enforce the ASI:One integration; keep their contracts stable when tweaking analytics or campaign helpers.

## Routing Workflow
1. **Backend route** – add a module in `backend/src/routes` that returns an `express.Router`, group middleware near the top (validation, file uploads, etc.), and export it as `default`. Register it in `backend/src/server.ts` alongside the other routers and keep the route prefix consistent (e.g., `/api/<feature>`).
2. **Database updates** – if the new API touches persisted data, update `backend/src/database` (schema SQL or migration helpers), and verify that `migrateToV3`/`migrateShop` still run without errors.
3. **Client API** – mirror the backend shape in `frontend/src/services/api.ts`. Expose functions that return the axios `api` promise so existing pages can import them without repeating base URL/auth logic.
4. **UI route** – create or reuse a page under `frontend/src/pages`, add its `<Route>` inside `frontend/src/App.tsx`, and surface it via `Layout` if it belongs to the authenticated shell.
5. **Navigation/documentation** – update `Layout` (and any nav helpers) so the new view is reachable, and document the endpoint in `README.md`, `QUICKSTART*.md`, or a dedicated doc so teammates find the new API/route quickly.

## Feature Addition Checklist
- Create the backend router, add tests/data validation where needed, and wire it through `server.ts` after the JWT guard.
- Keep the frontend API layer in sync by adding new exports to `services/api.ts` (admin vs. public clients use different axios instances). Match naming so it’s obvious which backend router it mirrors.
- Update React Router in `App.tsx` plus `Layout`/nav to expose the feature for authenticated users; unauthenticated flows go through `/shop` or the `Login` redirect.
- Refresh docs, READMEs, or `QUICKSTART_V3.md` when you add a new major feature so rollback/reviewers know where the API lives and what data it returns.
- Run `npm run dev` in both `backend` and `frontend` (two terminals) to verify the Express migrators and Vite hot reloaders stay green. Watch `backend/src/server.ts` logs for migration errors and `frontend` console for route/render errors.

## Docs
- **Routing**: `backend/src/server.ts` is the canonical map of `/api/...` endpoints; refer to it whenever you add, rename, or reorganize routers, and mirror those names in `frontend/src/services/api.ts` so axios paths stay predictable.
- **Adding a feature**: Document new backend routes, expected payloads, and UI entry points in `README.md` (or `QUICKSTART_V3.md` for release notes). Note any new env vars (JWT_SECRET, VITE_API_BASE_URL) and continually run the migrations that fire at startup.
- **What to check**: After updates, confirm the backend logs the new router, check that `Layout` still guards routes behind the login flag, rerun any relevant imports (CSV/XLSX) if files changed, and make sure the new route appears in the UI nav, the `services/api.ts` export list, and the public docs.
- **Where to update**: Backend logic in `backend/src/routes`, migrations/schemas in `backend/src/database`, front-end wiring in `frontend/src/pages`, `frontend/src/components/Layout.tsx`, `frontend/src/App.tsx`, and the axios client in `frontend/src/services/api.ts`. Use the `sample-data` folder to validate import-heavy flows.
