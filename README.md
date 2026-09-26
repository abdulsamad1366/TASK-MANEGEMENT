# SyncPlan — Team Task & Project Management Platform

A full-featured, high-velocity project and task management web application engineered for internal software engineering and product teams (Linear / Asana / ClickUp style).

---

## 🌟 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | [Next.js](https://nextjs.org/) (App Router, TypeScript) + [Tailwind CSS](https://tailwindcss.com/) |
| **Backend** | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (RESTful API in TypeScript) |
| **Database** | [Supabase](https://supabase.com/) PostgreSQL / [Prisma ORM](https://www.prisma.io/) (with instant local SQLite fallback) |
| **Real-time** | [Socket.io](https://socket.io/) (Live card drag & drop, comment threads, presence, instant alerts) |
| **Authentication** | JWT (Access & Refresh tokens with auto-renew), `bcryptjs` password hashing |
| **File Storage** | Supabase Storage (S3-compatible bucket) with local server fallback |
| **API Docs** | Interactive OpenAPI / Swagger UI (`/api/docs`) |
| **Deployment** | **Vercel** (Frontend) + **Docker Container** (Backend) |

---

## 🚀 Key Features

### 1. Authentication & Team Management
- **Role-Based Access Control (RBAC)**: `ADMIN`, `MANAGER`, and `MEMBER` roles with granular permission checks.
- **Organization & Workspaces**: Multi-workspace architecture with seamless switching.
- **Team Invitations**: Invite colleagues via email and generate secure join links.
- **User Profiles**: Custom avatars, name, and personal notification preferences.

### 2. Multi-View Project Boards
- **Kanban Board**: Drag-and-drop task cards between and within columns with optimistic UI updates and celebratory confetti on completion.
- **List View**: Structured tabular/grouped layout with inline priority badges, assignees, and quick status changes.
- **Calendar View**: Interactive month grid mapping tasks to due dates.
- **Timeline / Gantt View**: 3-week schedule visualizing task start dates, due dates, and duration bars.
- **Customizable Columns**: Create, edit, and reorder custom columns (`Backlog`, `To Do`, `In Progress`, `In Review`, `Done`).

### 3. Task Management & Dependencies
- **Task Attributes**: Title, rich markdown description, priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), start date, due date, tags/labels.
- **Subtasks & Checklists**: Interactive checklists with instant completion toggle and animated progress bars.
- **Task Dependencies**: Link blocking and blocked-by tasks with dependency visual alerts.
- **Recurring Tasks**: Automatic recurrence support (`DAILY`, `WEEKLY`, `MONTHLY`).
- **Bulk Actions**: Select multiple tasks to update column status or priority in bulk.

### 4. Collaboration & Audit Logs
- **Comments with @Mentions**: Team discussion threads with automatic `@name` mention detection and alert dispatching.
- **File Attachments**: Upload task documents and images with file size tracking.
- **Audit Activity Trail**: Detailed chronological history of status transitions, priority edits, and comments.

### 5. Executive Dashboard & Burndown Reporting
- **Personal Dashboard**: Track assigned tasks, overdue action items, and deadlines due today or this week.
- **Team Workload Breakdown**: View active vs completed tasks per team member.
- **Burndown Chart**: Interactive SVG sprint velocity chart showing Ideal vs Actual remaining trajectory.

### 6. Search & Notifications
- **Global Spotlight Search (`⌘K` / `Ctrl+K`)**: Rapid search across all tasks, projects, and task numbers.
- **Notification Center**: In-app bell with live counter, mark-as-read, clear-all, and quick navigation.

---

## 💻 Quick Start (Local Development)

### 1. Install Dependencies
```bash
# In project root:
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Setup Database & Seed Demo Data
The backend is pre-configured with Prisma. You can run the database immediately using the local database:
```bash
npm run db:sqlite
npm run seed
```

### 3. Start Both Backend & Frontend Concurrently
```bash
npm run dev
```
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5001](http://localhost:5001)
- **Swagger API Docs**: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)

---

## 🔑 Demo Accounts (Password: `Password123!`)

Click any of the instant demo buttons on the login screen or sign in with:

| User | Email | Role | Title |
|---|---|---|---|
| **Sarah Connor** | `admin@acme.com` | `ADMIN` | Lead Architect & Workspace Admin |
| **Alex Rivera** | `manager@acme.com` | `MANAGER` | Engineering Product Manager |
| **David Chen** | `david@acme.com` | `MEMBER` | Backend Systems Engineer |
| **Priya Patel** | `priya@acme.com` | `MEMBER` | UI/UX & Design Systems |
| **Marcus Vance** | `marcus@acme.com` | `MEMBER` | Full-stack Engineer |

---

## ☁️ Supabase PostgreSQL Setup (Production / Cloud DB)

1. Create a project on [Supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **Database** and copy your **Connection String** (Transaction pooler & direct connection).
3. In `backend/.env`:
```env
DATABASE_URL="postgresql://postgres.[your-project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[your-project]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

SUPABASE_URL="https://[your-project].supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET="attachments"
```
4. Push schema and seed data to Supabase:
```bash
npm run db:supabase
npm run seed
```
*(Alternatively, copy and run `backend/prisma/supabase-schema.sql` directly inside Supabase SQL Editor).*

---

## 🚀 Deployment Guide

### Deploying Frontend to Vercel
1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New Project** and select this repo.
3. Set **Root Directory** to `frontend`.
4. Configure Environment Variables in Vercel:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend-api-domain.com/api`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://your-backend-api-domain.com`
5. Click **Deploy**. Vercel will automatically run `npm run build` and deploy the App Router site.

### Deploying Backend with Docker
A production multi-stage `Dockerfile` and `docker-compose.yml` are included.

To build and run the backend container:
```bash
docker compose up -d --build
```
Or build the image directly:
```bash
cd backend
docker build -t task-management-backend .
docker run -p 5001:5001 -e DATABASE_URL="your-supabase-url" task-management-backend
```

---

## 📂 Project Architecture

```
TASK MANAGEMENT/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Active Prisma ORM schema
│   │   ├── schema.supabase.prisma# Supabase PostgreSQL schema definition
│   │   ├── schema.sqlite.prisma  # SQLite zero-setup schema
│   │   ├── supabase-schema.sql   # Raw SQL script for Supabase SQL Editor
│   │   └── seed.ts               # Seed script with realistic projects & tasks
│   ├── src/
│   │   ├── config/               # Prisma and Supabase client configs
│   │   ├── controllers/          # Auth, Workspaces, Projects, Tasks, Comments, etc.
│   │   ├── middleware/           # JWT Auth, RBAC permissions, Zod validation
│   │   ├── routes/               # Express REST route handlers
│   │   ├── services/             # Socket.io gateway & File Storage (Supabase/Local)
│   │   ├── utils/                # JWT generation, Password hashing
│   │   ├── swagger.ts            # OpenAPI 3.0 specification
│   │   └── server.ts             # Express + HTTP + Socket.io Server
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css       # Tailwind CSS & Dark theme tokens
│   │   │   ├── layout.tsx        # App layout with Providers
│   │   │   └── page.tsx          # Main application interactive interface
│   │   ├── components/           # Kanban, List, Calendar, Timeline, Modals, Navbar
│   │   ├── context/              # Auth, Notifications, Theme contexts
│   │   ├── lib/                  # ApiClient, SocketClient, Formatters
│   │   └── types/                # TypeScript models and interfaces
│   ├── vercel.json               # Vercel deployment spec
│   └── package.json
│
├── docker-compose.yml            # Docker Compose configuration
├── package.json                  # Root runner scripts
└── README.md
```
