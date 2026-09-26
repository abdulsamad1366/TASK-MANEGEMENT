# Flowdesk — Team Task & Project Management

<p align="center">
  <img src="frontend/public/logo.png" alt="Flowdesk Logo" width="120" style="border-radius: 24px;" />
</p>

<p align="center">
  <strong>Flowdesk</strong> is a full-featured, high-velocity team task management web application — featuring a clean, light, minimal UI, generous whitespace, subtle borders, signature <code>#7B68EE</code> purple accents, and a robust 5-tier organization hierarchy.
</p>

---

## 🌟 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | [Next.js](https://nextjs.org/) (App Router, Turbopack, TypeScript) + [Tailwind CSS](https://tailwindcss.com/) |
| **Backend** | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (REST API in TypeScript) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (with [Prisma ORM](https://www.prisma.io/)) / Supabase / Offline SQLite fallback |
| **Real-time** | [Socket.io](https://socket.io/) (Live task updates, notifications, and in-task real-time chat) |
| **Authentication** | JWT-based auth with refresh tokens, `bcryptjs` password hashing |
| **File Storage** | S3 / Supabase storage with local `/uploads` media gateway |
| **Deployment Target** | **Vercel** (Frontend) + **Docker Container** (Backend) |

---

## 🎨 Design Direction

- **Light Color Scheme Only**: Clean off-white and pure white backgrounds (`#F8FAFC`, `#FFFFFF`), soft grays (`#E2E8F0`), and Flowdesk purple accent (`#7B68EE`).
- **Minimal, Uncluttered Layout**: Generous whitespace, subtle borders/shadows instead of heavy dividers.
- **Clean Sans-Serif Typography**: Standard modern sans font stack (`Inter`, system UI).
- **Flowdesk Architecture**: Sidebar navigation (`Spaces > Projects > Lists`), top bar with view switcher, card-based task rows with cover image previews.

---

## 🚀 Core Features

### 1. 5-Tier Workspace Hierarchy
- **Workspace > Space > Project > List > Task**:
  - **Spaces** (e.g. `Engineering`, `Product & Design`) with custom icons and color badges.
  - **Projects** (e.g. `Mobile App 3.0` [APP], `API Infrastructure` [API]).
  - **Lists** (e.g. `Sprint 24 - Launch`, `Product Backlog`) with customizable status columns (`To Do`, `In Progress`, `In Review`, `Done`).
  - **Tasks** assigned to any team member with rich specifications.

### 2. In-Task Chat & Team Collaboration (Mini Slack Channel per Task)
- **Live Real-Time In-Task Chat**: Every individual task has a dedicated real-time chat thread running over Socket.io (`task:${taskId}`).
- **In-Chat Image & File Sharing**: Upload and view image previews directly inside chat messages.
- **Chat While Creating**: Author and upload images or write team notes directly in the task creation split modal.
- **@Mentions**: Tag teammates with `@name` to trigger instant notifications.
- **Audit Activity Trail**: Dedicated Activity Log history separate from the conversation thread.

### 3. Comprehensive Task Management
- **Universal Creation**: Any team member can create tasks.
- **Multi-Assignee Support**: Assign multiple team members to a single task simultaneously.
- **Task Fields**: Title, rich-text description, priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), start date, due date, time estimate (e.g. `4h 30m`), cover images, tags/labels.
- **Attachments Gallery**: Drag-and-drop or upload file attachments with image thumbnail preview and lightbox modal.
- **Subtasks & Progress Bar**: Interactive checklists with instant completion toggle and visual percentage bar.
- **Task Dependencies**: "Blocked by" and "Blocking" task relationships.
- **Kanban Board with Drag-and-Drop**: Fluid drag-and-drop status changes with celebratory confetti on completion.
- **Bulk Actions**: Multi-select tasks to update status or priority in bulk.

### 4. Multiple List Views
- **Kanban Board**: Drag-and-drop columns with custom status colors and task counters.
- **List / Table View**: Structured grouped rows with inline priority, estimate, due date, and assignees.
- **Calendar View**: Interactive month grid mapping deadlines with quick today navigation.
- **Timeline / Gantt View**: 3-week interactive schedule visualizing task duration bars.

### 5. Notifications & Personalization
- **In-App Notification Center**: Notification bell with live unread badge, mark-all-read, and quick task jumping.
- **Notification Preferences**: Granular settings for assignments, mentions, comments, due dates, and emails.
- **Personal "My Tasks" & Analytics**: Executive dashboard with Sprint Burndown chart and member workload breakdown.
- **Global Spotlight Search (`⌘K` / `Ctrl+K`)**: Rapid search across tasks, projects, and keys.

---

## 💻 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **npm**

### 2. Install Dependencies
```bash
# In the root repository directory:
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Setup Database & Seed Sample Data
```bash
# Push Prisma schema to local database and seed Flowdesk demo hierarchy:
npm run db:sqlite
npm run seed
```

### 4. Run Locally
```bash
npm run dev
```
- **Frontend Next.js**: [http://localhost:3000](http://localhost:3000) (or 3001)
- **Backend API**: [http://localhost:5001](http://localhost:5001)
- **Interactive Swagger Docs**: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)

---

## 🏢 Multi-Tenant Architecture & Supabase Integration

Flowdesk is built around a scalable **Multi-Tenant Workspace Model** where every piece of data is isolated to its respective workspace:

### 1. Workspace Types & Join Policies
- **Personal**: Single-user private workspace for personal productivity, private notes, and focused task lists.
- **Team / Group**: Private, invite-only organization workspace with role-based member permissions (`ADMIN`, `MANAGER`, `MEMBER`) and unique workspace invite codes (e.g. `ACME-TEAM-2026`).
- **Community**: Public or invite-based open communities with open share links (e.g. `COMMUNITY-FLOWDESK-2026`) for open-source contributors and community bounties.

### 2. Global "My Tasks" Aggregation
Users belonging to multiple workspaces can view all tasks assigned to them across Personal, Team, and Community workspaces from the **Global My Tasks** view in the sidebar.

### 3. Supabase Row Level Security (RLS)
All database multi-tenancy is enforced at the PostgreSQL database level via Row Level Security (RLS):
- Every tenant table (`Workspace`, `WorkspaceMember`, `Space`, `Project`, `TaskList`, `BoardColumn`, `Task`, `Comment`, `Attachment`, `ActivityLog`, `Notification`) has RLS enabled.
- Normalization: `Task.workspaceId` is directly indexed and validated against `WorkspaceMember` lookup, eliminating deep 4-way joins and guaranteeing sub-millisecond policy evaluation.
- RLS migration file: `backend/prisma/supabase-schema.sql` and `backend/prisma/migrations/01_multi_tenant_rls.sql`.

### 4. Supabase Storage & Realtime
- **Supabase Storage**: Bucket `attachments` stores image attachments and uploaded files with public read policy and authenticated upload policy.
- **Supabase Realtime**: Live updates published to `Task`, `Comment`, `Notification`, and `BoardColumn`.

### 5. Supabase Environment Variables
Configure the following in `backend/.env` and `frontend/.env.local`:
```bash
# Backend (.env)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"

# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
NEXT_PUBLIC_API_URL="http://localhost:5001/api"
```

To run migrations and seed the multi-tenant workspaces:
```bash
cd backend
npx prisma db push
psql "[DATABASE_URL]" -f prisma/supabase-schema.sql
npx ts-node prisma/seed.ts
```

---

## 🔑 Demo Accounts (Password: `Password123!`)

Click any of the instant 1-click login buttons on the login modal:

| User | Email | Role | Title |
|---|---|---|---|
| **Sarah Connor** | `admin@acme.com` | `ADMIN` | Lead Architect & Workspace Admin |
| **Alex Rivera** | `manager@acme.com` | `MANAGER` | Engineering Product Manager |
| **David Chen** | `david@acme.com` | `MEMBER` | Backend Systems Engineer |
| **Priya Patel** | `priya@acme.com` | `MEMBER` | UI/UX & Design Systems |
| **Marcus Vance** | `marcus@acme.com` | `MEMBER` | Full-stack Engineer |

---

## 🐳 Docker Deployment

To build and run the backend inside Docker:
```bash
cd backend
docker build -t task-management-backend .
docker run -p 5001:5001 --env-file .env task-management-backend
```
