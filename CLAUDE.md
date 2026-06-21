# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, HMR)
npm run build     # Type-check then bundle (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

No test runner is configured.

## Environment

Create a `.env.local` with:
```
VITE_API_URL=http://localhost:3000
```

`VITE_API_URL` is the only required env variable — the axios instance in `src/lib/api.ts` uses it as `baseURL`.

## Architecture

### Two separate interfaces

| Interface | Layout | Routes | Who |
|---|---|---|---|
| Merchant app | `AppLayout` | `/`, `/caisse`, `/produits`, … | owner + employee |
| Super-admin | `AdminLayout` | `/admin/**` | super_admin role only |

These are completely separate route trees in `App.tsx`. Never mix admin API calls (`/api/admin/**`) into merchant pages.

### Layout system (important)

`AppLayout` wraps every merchant page's `<Outlet />` with:

```tsx
<div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
  <Outlet />
</div>
```

**Pages must not add their own `max-w-*`, `mx-auto`, or padding container.** Their root element should simply be a spacing wrapper like `<div className="space-y-5">`. The layout handles all width and horizontal padding once.

Desktop: `SideNav` (fixed, 256 px, `md:flex`), content area offset with `md:pl-64`.  
Mobile: no sidebar, `BottomNav` fixed at bottom (72 px), content padded with `pb-[72px]`.

### Design tokens (Tailwind v4)

Defined via `@theme {}` in `src/index.css` — there is no `tailwind.config.js`. Use these semantic classes everywhere:

- **Surfaces**: `bg-canvas` (page bg), `bg-surface` (cards/inputs)
- **Text**: `text-ink` (primary), `text-muted` (secondary)
- **Border**: `border-line`
- **Brand**: `bg-brand-500`, `text-brand-500`, `hover:bg-brand-600`
- **Semantic**: `text-success`, `text-danger`, `text-warning`
- **Radii**: `rounded-card` (14px for cards), `rounded-control` (10px for inputs/buttons)
- **Shadow**: `shadow-card`
- **Fonts**: `font-sans` (body), `font-display` (headings — Sora), `font-mono` (amounts/data)

### Auth & API

- JWT stored in `localStorage` under key `"token"`. The axios interceptor in `src/lib/api.ts` attaches it automatically.
- A 401 response clears the token and redirects to `/login`.
- `AuthContext` exposes `user` (`AuthUser`: `userId`, `tenantId`, `role`) and `login`/`logout`.
- User roles: `"owner"`, `"employee"`, `"super_admin"`.

### Tenant & subscription

- `TenantContext` fetches the current tenant from `GET /api/tenant` on login and caches it in `localStorage` under `"tenant"`.
- `tenant.subscription` is a `SubscriptionStatus` (`status`, `tier`, `billingCycle`, `daysLeft`, `expiresAt`, `limits`).
- `useSubscription()` hook reads from `TenantContext` — use this everywhere instead of reading the context directly.
- Feature gating: wrap content with `<PremiumGate feature="FEATURE_KEY">`. Available features: `CAISSE`, `CLIENTS`, `STOCK`, `DEPENSES`, `STATS`, `EMPLOYEES`, `PDF_INVOICES`, `PROFORMAS`, `EXPORT`.
- `SubscriptionBanner` renders a status bar below the header automatically — no page setup needed.

### Navigation

Nav items are declared in `src/layout/navItems.ts` in two arrays:
- `COMMON_ITEMS`: visible to all roles (owner + employee)
- `OWNER_ITEMS`: visible to `owner` only

To add a new merchant page to the sidebar, add an entry to the appropriate array.  
`UserMenu` (desktop header dropdown) has links to `/profil`, `/parametres-commerce`, and `/mon-abonnement` (owner only).

### Services & types

- All API calls go through the axios instance exported from `src/lib/api.ts`.
- Service files live in `src/services/` (one per domain: `customersApi`, `adminApi`, `salesApi`, …).
- Types live in `src/types/` — `admin.ts` holds `SubscriptionStatus`, `SubscriptionEvent`, `ActivateSubscriptionRequest`.
- `isLifetime(sub)` helper in `src/types/admin.ts` — use it instead of checking `billingCycle === 'lifetime'` inline.

### UI components

Shared components in `src/components/ui/`:
- `Button` — variants: `primary` (default), `secondary`, `ghost`
- `Input`, `Select`, `Combobox`, `Modal`, `Card`, `EmptyState`, `PageHeader`, `PageActions`

Amounts displayed in FCFA: use `new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'`.  
Dates: `toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })`.
