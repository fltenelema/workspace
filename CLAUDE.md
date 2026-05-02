# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgroControl** is a full-stack agricultural management system for tracking farming cycles, crops, workers, sales, expenses, and labor costs. It uses a React/TypeScript frontend with a Node.js/Express backend and SQLite via Prisma ORM.

## Commands

### Frontend (root directory)
```bash
npm run dev       # Start Vite dev server on port 5173
npm run build     # TypeScript compile + Vite production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

### Backend (server/ directory)
```bash
npm run dev       # Start Express server with tsx watch on port 3001
npm run build     # Compile TypeScript to dist/
npm run start     # Run compiled dist/index.js
npm run seed      # Seed SQLite database with initial data
npm run db:push   # Sync Prisma schema to database
npm run db:studio # Open Prisma Studio GUI
```

After any schema change, run both `npm run db:push` and `npx prisma generate` (from `server/`) to sync the DB and regenerate the TypeScript client. **On Windows**, stop the `tsx` dev server before running `prisma generate` — Windows locks the query engine DLL while the server is running, causing an EPERM error that leaves the client in a broken state.

The frontend Vite dev server proxies all `/api/*` requests to `http://localhost:3001`.

## Architecture

### Frontend (`src/`)
- **`App.tsx`** — Router setup and protected route definitions with role-based guards (SUPER_ADMIN, ADMIN, SUPERVISOR, USER)
- **`context/AuthContext.tsx`** — Global auth state; validates JWT via `/api/auth/me` on load
- **`api/`** — Axios instance that attaches JWT from localStorage and handles 401 redirects
- **`pages/`** — Full-page views organized by domain: `ciclos/`, `reportes/`, `catalogos/`, `usuarios/`, `instancias/`, `tareas/`
- **`components/`** — Reusable UI; modals live in `components/modals/`; `Modal.tsx` is the base modal wrapper
- **`types/`** — Shared TypeScript interfaces for all domain entities

### Backend (`server/src/`)
- **`index.ts`** — Express app entry; registers routes and middleware
- **`middleware/auth.middleware.ts`** — JWT verification; `authenticate` and `requireRole` exported; sets `req.userId`, `req.userRole`, and `req.tenantId` on the request
- **`middleware/rateLimit.middleware.ts`** — In-memory rate limiter for login (15 attempts / 15 min per IP); applied inline in `auth.routes.ts`
- **`routes/`** — One file per resource, maps HTTP verbs to controller methods
- **`controllers/`** — Business logic layer; all DB access goes through Prisma
- **`lib/`** — Singleton Prisma client instance shared across controllers

### Data Model (`server/prisma/schema.prisma`)
Core entities and their relationships:
- **Tenant** — an isolated client instance; most entities belong to one via `tenantId`
- **User** — system users with roles (SUPER_ADMIN, ADMIN, SUPERVISOR, USER); `tenantId` is null only for SUPER_ADMIN
- **Block** — farm parcels/sections; unique per `(code, tenantId)`
- **Crop / Variety** — crop catalog and varieties; unique per `(name, tenantId)`
- **Client** — buyers/customers
- **Worker** — farm laborers
- **Cycle** — a production cycle linking a block, crop variety, and date range; is the central entity
- **Sale / Expense / Labor** — financial records tied to a Cycle; drive profit calculations
- **Inventory** — supply/material items with stock levels and low-stock alerting
- **Task** — work orders assigned to a Supervisor and linked to a Block; tracked through `Pendiente → En Proceso → Completada`
- **AuditLog** — optional action log (userId, entity, action, details)

### Key Patterns
- Authentication is JWT-only; the token lives in `localStorage` and is attached by the Axios interceptor.
- Role checks happen on both the frontend (`ProtectedRoute` in `App.tsx`) and the backend (`requireRole` middleware).
- **Multi-tenancy**: every controller uses a `tf(req)` helper (tenant filter) that returns `{}` for SUPER_ADMIN or `{ tenantId: req.tenantId }` for everyone else, injected into all Prisma `where` clauses.
- The Dashboard only shows non-`Cerrado` cycles. Financials are computed on the fly by summing `Sale.totalUsd`, `Expense.total`, and `Labor.total`.
- `NotificationBell` polls `/api/notifications` every 60 seconds; the notifications controller gracefully handles a missing Inventory model via a nested try/catch.
- No test suite is currently configured.

### Role Capabilities
- **SUPER_ADMIN** — cross-tenant; can manage all Tenants (`/instancias`), create tenants with their admin, and sees all data.
- **ADMIN / USER** — scoped to their tenant; can manage cycles, catalogs, tasks, etc.
- **SUPERVISOR** — scoped to their tenant; blocked from Ciclos, Reportes, and all Catálogos; on Tareas, sees only tasks assigned to them and can only update `status` and `notes`.
- `ProtectedRoute` accepts `roles` (whitelist) or `supervisorBlocked` (blocks SUPERVISOR, redirects to `/dashboard`).

### Non-Obvious Domain Rules
- **Block ↔ Cycle state sync**: Creating a Cycle sets `Block.status = 'En Cultivo'`; closing or deleting a non-`Cerrado` Cycle resets it to `'Libre'`. These updates are always done together in a `Promise.all`.
- **Cycle status flow**: `'En Curso'` → `'Cosechando'` → `'Cerrado'`. The `closeCycle` endpoint forces status to `'Cerrado'`; `updateCycleStatus` handles intermediate transitions.
- **Cycle code**: Auto-generated on create as `CIC-{YEAR}-{id:3-digit-padded}` (e.g. `CIC-2026-007`).
- **Sale grades**: Sales support up to 7 quality grades via `qty1`–`qty7` / `price1`–`price7`. `totalKg` and `totalUsd` are pre-calculated and stored, not derived at query time.
- **Stored totals**: `Labor.total` (days × dailyRate) and `Expense.total` (quantity × cost) are also pre-calculated and stored on write — never recomputed from parts.
- **Alert thresholds**: Harvest urgency is computed from `sowingDate + crop.harvestDays`. Red = ≤7 days, Yellow = ≤15 days, Green = otherwise.
- **Inventory stock alerts**: Low-stock = `quantity <= minStock` (only checked when `minStock > 0`).
- **Tenant toggle**: Toggling a Tenant's `active` flag also bulk-updates all non-SUPER_ADMIN users in that tenant.
- **Task assignment**: Tasks can only be assigned to users with `role = 'SUPERVISOR'` within the same tenant; enforced on both create and update.
- **UI language**: All user-facing text is in Spanish (labels, status values, error messages).

### Environment Setup
The backend requires a `server/.env` with:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret"
```
After cloning, run `npm run db:push` then `npm run seed` then `npx prisma generate` from `server/` to initialize the database and generate the TypeScript client.
