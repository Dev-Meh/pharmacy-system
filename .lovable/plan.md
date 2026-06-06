## Pharmacy Management System — v1 (Core)

Replaces the existing church website. Built on Lovable Cloud with email/password auth and role-based access.

### Pages & flows

- `/auth` — Login + Sign up (email, username, password). Pharmacy/medical themed background. Validation. First user that signs up is auto-promoted to `admin`; subsequent signups default to `pharmacist`.
- `/` — Redirects to `/dashboard` if logged in, else `/auth`.
- `/dashboard` (all roles) — Sidebar + top navbar with profile, stat cards (total drugs, low stock, expiring soon, today's sales).
- `/users` (admin only) — Create / edit / delete users, assign roles (`admin`, `pharmacist`, `store_manager`).
- `/drugs` (admin + store_manager) — CRUD on drugs: name, category, price, quantity, expiry date, supplier. Search bar.
- `/sales` (all roles) — Sell drug (pick drug + quantity → auto-decrement stock, record sale). View sales history list.

### Roles
- `admin` — full access to everything.
- `store_manager` — drugs + sales + dashboard.
- `pharmacist` — sales + dashboard.

### Database (Lovable Cloud)

```text
profiles          (id=auth.uid, full_name, username, email)
app_role enum     ('admin','pharmacist','store_manager')
user_roles        (id, user_id, role)  ← roles live here, never on profiles
drugs             (id, name, category, price, quantity, expiry_date, supplier, created_at)
sales             (id, drug_id, quantity, unit_price, total, sold_by, sold_at)
```

- `has_role(uid, role)` SECURITY DEFINER function.
- RLS on every table; policies use `has_role`.
- Trigger on `auth.users` insert → creates `profiles` row + assigns role (`admin` if first user, else `pharmacist`).
- Trigger on `sales` insert → decrements `drugs.quantity` atomically; rejects if insufficient stock.

### UI / Design

- Medical theme: white surfaces, deep medical blue primary, healing green accent, soft slate neutrals. Replace existing church tokens in `src/styles.css`.
- shadcn components: Sidebar, Card, Table, Dialog, Form, Input, Select, Button, Badge.
- Responsive: sidebar collapses to icons on mobile.
- Smooth fade-in on route content.

### Cleanup
- Delete church routes (`about`, `contact`, `our-events`), church assets (`worship-hero.jpg`, `choir.jpeg`, `bible.jpg`, `community.jpg`, `outdoor-worship.jpg`, `pastor-preaching.jpeg`, `prayer-circle.jpg`, `baptism.jpg`), `MusicToggle`, `WorshipScheduleList`, `worship-schedule.ts`.
- Rewrite `__root.tsx` and `index.tsx` for the new app shell.

### Out of scope for v1 (can add later)
Low-stock/expiry notifications, sales analytics charts, reports, activity logs, receipt export, dark mode toggle, forgot-password flow.

### Technical notes
- Auth: email/password only (per "Core only"). Email confirmation **disabled** for smoother testing — first signup becomes admin instantly.
- All data reads/writes via `supabase` client from components with RLS enforcing access (no server functions needed for v1).
- One generated pharmacy hero image for the login page.
