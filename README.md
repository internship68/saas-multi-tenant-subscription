# SaaS Multi-Tenant Subscription Platform

A production-oriented, multi-tenant SaaS subscription management system built with a scalable, clean architecture approach.

This project demonstrates advanced backend system design, tenant isolation strategy, subscription lifecycle management, and modern frontend architecture using Next.js.

---

# 🏛 System Overview

This platform enables:

- Multi-organization (multi-tenant) support
- Role-based user access per organization
- Subscription plan management
- Usage-based metering
- Background billing cycle reset
- Secure JWT authentication
- Clean architecture backend structure

---

# 🧱 Tech Stack

## Backend

- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- JWT Authentication

## Frontend

- Next.js (App Router)
- React
- TanStack Query
- Axios
- TailwindCSS

---

# 🧠 Architecture Design

## Backend Architecture (Clean Architecture)

src/
├── domain/
├── application/
├── infrastructure/
├── modules/
└── common/

### Principles Applied

- Separation of Concerns
- Repository Pattern
- Dependency Inversion
- Domain-driven structure
- Stateless authentication
- Queue-based background processing

---

## Multi-Tenant Strategy

Tenant isolation is implemented using:

- `organizationId` as scoped identifier
- All domain entities linked to Organization
- Query-level isolation
- JWT contains tenant context

No cross-tenant data exposure is possible at application layer.

---

# 🗂 Entity Relationship (ER Diagram)

Organization
├── id
├── name
└── createdAt
│
│ 1
│
▼
User
├── id
├── email
├── password
├── role
└── organizationId (FK)
│
│ 1
▼
Subscription
├── id
├── plan
├── status
├── currentPeriodStart
├── currentPeriodEnd
└── organizationId (FK)
│
│ 1
▼
Usage
├── id
├── metric
├── value
└── organizationId (FK)
│
│ 1
▼
Payment
├── id
├── amount
├── status
└── organizationId (FK)

---

# 🔌 API Overview

## Auth

| Method | Endpoint       | Description                       |
| ------ | -------------- | --------------------------------- |
| POST   | /auth/register | Register new organization + owner |
| POST   | /auth/login    | Login user                        |

---

## Users

| Method | Endpoint   | Description             |
| ------ | ---------- | ----------------------- |
| GET    | /users     | List organization users |
| POST   | /users     | Create new user         |
| PATCH  | /users/:id | Update user             |
| DELETE | /users/:id | Remove user             |

---

## Subscription

| Method | Endpoint              | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | /subscription         | Get current subscription |
| POST   | /subscription/upgrade | Upgrade plan             |
| POST   | /subscription/cancel  | Cancel subscription      |

---

## Usage

| Method | Endpoint         | Description             |
| ------ | ---------------- | ----------------------- |
| GET    | /usage           | Get usage metrics       |
| POST   | /usage/increment | Increment usage counter |

---

# 🔁 Subscription Lifecycle

1. Organization registers
2. Default plan assigned
3. Usage tracked continuously
4. Background job checks billing cycle
5. Usage resets when new billing period starts
6. Payment record generated

Background processing handled by:

- BullMQ
- Redis queue
- Scheduled worker

---

# 🖥 Frontend Structure

src/
├── app/
├── components/
├── services/
├── lib/
├── providers/
├── hooks/
└── types/

### Frontend Design Decisions

- Centralized Axios client
- React Query for server-state management
- Provider pattern for global configuration
- Feature-based routing
- Separation between UI and service layer

---

# ⚙️ Getting Started

## Install Dependencies

### Backend

```bash
cd backend
npm install
Frontend
cd frontend
npm install
Environment Variables
Backend .env
DATABASE_URL="postgresql://user:password@localhost:5432/saas"
JWT_SECRET="your-secret"
REDIS_HOST=localhost
REDIS_PORT=6379
Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
Database Setup
cd backend
npx prisma migrate dev
npx prisma generate
Run Application
Backend
npm run start:dev
Frontend
npm run dev
📈 Scalability Considerations
Stateless API (horizontal scaling ready)

Redis-backed job queue

Tenant-level indexing

Isolated service modules

Easily extendable billing integration (Stripe-ready)

🔒 Security Considerations
JWT authentication

Password hashing

Tenant isolation enforcement

Role-based access control

Input validation layer

DTO-based request schema validation

🚀 Future Improvements
Stripe payment integration

Webhook event handling

Rate limiting

API versioning

Caching layer

Kubernetes deployment

CI/CD automation

Observability (Prometheus + Grafana)

📌 Engineering Goals
This project demonstrates:

Advanced backend system design

Clean architecture implementation

Multi-tenant SaaS modeling

Scalable subscription logic

Production-ready folder structuring

Real-world engineering tradeoffs
```
