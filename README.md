# FinAI — AI-Powered Personal Finance Intelligence System

FinAI turns raw transaction data into clear insights, proactive alerts, and forward-looking
projections. It combines a financial analytics engine, a Google Gemini–powered assistant
grounded in the user's real data, and a "what-if" scenario simulator — wrapped in a polished,
responsive dashboard.

**Code:** [GitHub Repository](https://github.com/iampraneeth1116/FinAI) · **Live Demo:** [fin-ai-v1.vercel.app](https://fin-ai-v1.vercel.app/login)

**Tech Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Recharts · Express 5 · Prisma · PostgreSQL · JWT + bcrypt · Zod · Google Gemini API · Jest + Supertest

---

## ✨ Features

### Core
- **Secure auth** — JWT sessions with bcrypt password hashing (cost factor 12), constant-time
  login comparison to prevent user enumeration, and protected API routes.
- **Analytics dashboard** — total balance, income/expenses, 6-month cash-flow trends, and
  category breakdowns rendered with Recharts.
- **Transactions** — manual entry, inline editing, category tagging, and bulk **CSV import**
  (case-insensitive headers, validation, duplicate-skipping).
- **Budgets** — monthly limits with live spend tracking and over-budget indicators.
- **AI assistant** — Gemini-powered chat grounded in the user's real transactions, plus
  auto-generated proactive insights (cached for cost efficiency).
- **Scenario simulator** — projects future balances from income/expense changes and one-time
  costs, with a baseline comparison.

### New financial-intelligence features
- 🔁 **Recurring / subscription detection** — automatically finds recurring charges by grouping
  merchants, checking amount consistency, and classifying cadence (weekly → yearly). Surfaces an
  estimated total monthly subscription cost on the dashboard.
- 🛡️ **Anomaly & fraud alerts** — statistical rules flag unusual activity: amount spikes
  (> mean + 2.5σ), first-time merchants in the recent window, and likely duplicate charges.
  Severity-ranked and shown in the UI.
- 💸 **Budget alerts** — warns when more than 80% of this month's budget is used and flags it
  once spending goes over.
- 🎯 **Savings goal tracking** — create goals ("Save $5,000 by December"), log contributions,
  and get an on-track/off-track projection of the completion date based on your real saving rate,
  plus the monthly amount required to hit the deadline.
- 📄 **Report export** — download a formatted monthly **PDF** (summary, category bars,
  transactions table) or a **CSV** straight from the dashboard.

### Quality & security
- **Validation everywhere** — every write route is validated/coerced with **Zod** schemas.
- **Centralized error handling** — consistent JSON error shape, Prisma error mapping, and no
  stack-trace leakage in production.
- **Rate limiting** — strict limits on auth (anti-brute-force) and AI (cost protection) routes,
  plus a global limiter.
- **Hardening** — Helmet security headers, configurable CORS allow-list, request size limits,
  fail-fast on missing secrets in production, and a single pooled Prisma client.
- **Automated tests** — 40 Jest + Supertest tests covering auth, transactions, budgets, scenario
  simulation, and the financial-intelligence algorithms.
- **Frontend polish** — shared API client with auto token handling + 401 redirect, loading
  skeletons, empty states, and inline error/success messaging across pages.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend — Next.js (App Router) + React + Tailwind          │
│  Dashboard · Transactions · Budgets · Goals · Simulator ·    │
│  AI Assistant · Settings                                     │
│  app/lib/api.js  → centralized fetch (auth, errors, download)│
└───────────────────────────┬─────────────────────────────────┘
                            │  REST (JSON) + Bearer JWT
┌───────────────────────────▼─────────────────────────────────┐
│  Backend — Express 5                                          │
│  middleware:  auth · validate(zod) · rateLimit · errorHandler│
│  routes:      auth, users, transactions, categories,         │
│               budgets, analytics, scenario, ai,              │
│               recurring, alerts, goals, reports              │
│  lib:         finance.js (detection/projection algorithms),  │
│               report.js (PDF/CSV builders), prisma, config   │
└───────────────────────────┬─────────────────────────────────┘
                            │  Prisma ORM
┌───────────────────────────▼─────────────────────────────────┐
│  PostgreSQL — User · Category · Transaction · Budget · Goal   │
└──────────────────────────────────────────────────────────────┘
                            │
                    Google Gemini API (chat, insights, categorization)
```

The financial-intelligence logic lives in pure, dependency-free functions
(`backend/lib/finance.js`, `backend/lib/report.js`) so it can be unit-tested in isolation and
reused across routes.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A PostgreSQL database (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com))
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Backend
```bash
cd backend
cp .env.example .env        # then fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npm install
npx prisma db push          # create tables (User, Category, Transaction, Budget, Goal)
npm run seed                # optional: demo users + sample data
npm run dev                 # starts on http://localhost:4000
```

Demo accounts (after seeding): `alice@example.com` … `eva@example.com`, password `password123`.

### 2. Frontend
```bash
cd frontend
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev                 # starts on http://localhost:3000
```

### 3. Run the tests
```bash
cd backend
npm test
```

---

## 🔌 API Overview

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/auth/register`, `/api/auth/login` | Auth (rate-limited) |
| GET/POST/PUT/DELETE | `/api/transactions` | Transaction CRUD + `/upload` (CSV) |
| GET/POST/PUT/DELETE | `/api/budgets` | Budgets with spend tracking |
| GET/POST/PUT/DELETE | `/api/categories` | Category management |
| GET/POST/PUT/DELETE | `/api/goals` | Goals + `/:id/contribute` + projections |
| GET | `/api/recurring` | Detected subscriptions + monthly cost |
| GET | `/api/alerts` | Budget alerts and anomaly / fraud alerts |
| GET | `/api/analytics/{summary,monthly,by-category,recent}` | Dashboard analytics |
| POST | `/api/scenario/simulate` | What-if projections |
| GET | `/api/reports/monthly[.pdf|.csv]` | Monthly report (JSON/PDF/CSV) |
| POST/GET | `/api/ai/{chat,insights,categorize}` | Gemini assistant (rate-limited) |
| GET/PUT | `/api/users/me` | Profile + password change |

---

## 📁 Project Structure

```
backend/
  lib/        prisma.js · config.js · asyncHandler.js · ApiError.js · finance.js · report.js
  middleware/ auth.js · validate.js · rateLimit.js · errorHandler.js
  routes/     auth, users, transactions, categories, budgets, analytics,
              scenario, ai, recurring, alerts, goals, reports
  schemas/    zod validation schemas
  __tests__/  jest + supertest suites
  prisma/     schema.prisma · seed.js
frontend/
  app/
    lib/api.js          centralized API client
    components/         RecurringCard · AlertsPanel · ReportExport · Sidebar · …
    page.js             dashboard
    transactions/ budgets/ goals/ scenario/ assistant/ settings/ login/ register/
```



cd backend && npx prisma db push && npm run seed