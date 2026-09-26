# 🚀 Flowdesk Production Deployment Guide
### Vercel (Frontend) + Render / Railway (Backend) + Supabase (Database & Storage)

This guide walks you through deploying **Flowdesk** to production in less than 10 minutes.

---

## Architecture Overview

```
┌─────────────────────────────────┐
│     Vercel (Next.js 16)         │ ─── User Browser / Mobile Phone
│     https://your-app.vercel.app │
└────────────────┬────────────────┘
                 │
                 │ /api proxy rewrite
                 ▼
┌─────────────────────────────────┐
│    Render / Railway (Express)   │ ─── Socket.io & REST API
│    https://your-api.onrender.com│
└────────────────┬────────────────┘
                 │
                 │ Prisma ORM (Port 6543 / 5432)
                 ▼
┌─────────────────────────────────┐
│  Supabase Cloud (PostgreSQL)    │ ─── PostgreSQL Database
│  kizmafwjqsjpfcuduaqp           │ ─── Supabase Storage ('attachments')
└─────────────────────────────────┘
```

---

## Step 1: Deploy Backend to Render (Free)

1. Go to [Render Dashboard](https://dashboard.render.com/) and sign in.
2. Click **New +** &rarr; **Web Service**.
3. Select **Build and deploy from a Git repository** and connect:
   `https://github.com/abdulsamad1366/TASK-MANEGEMENT`
4. Fill in the service settings:
   - **Name**: `flowdesk-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.kizmafwjqsjpfcuduaqp:rRH08vvft05ZDXnu@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase Pooler connection |
| `DIRECT_URL` | `postgresql://postgres.kizmafwjqsjpfcuduaqp:rRH08vvft05ZDXnu@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres` | Supabase Direct connection |
| `JWT_SECRET` | `super_secret_jwt_token_key_change_in_production_123456789` | Or any secure 32+ char string |
| `JWT_REFRESH_SECRET` | `super_secret_refresh_jwt_key_change_in_production_987654321` | Or any secure 32+ char string |
| `JWT_EXPIRES_IN` | `7d` | Access token lifespan |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh token lifespan |
| `NODE_ENV` | `production` | Production mode |
| `CLIENT_URL` | `https://your-flowdesk-frontend.vercel.app` | (Update once Vercel is deployed) |

6. Click **Create Web Service**.
7. Once deployed, Render will provide your public API URL (e.g. `https://flowdesk-api.onrender.com`).
8. *(Optional)* Seed initial data: In Render Shell, run:
   ```bash
   npm run seed
   ```

---

## Step 2: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Import the Git repository:
   `https://github.com/abdulsamad1366/TASK-MANEGEMENT`
3. In the **Configure Project** screen:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select `frontend` *(Important!)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Expand **Environment Variables** and add:

| Key | Value | Description |
|---|---|---|
| `BACKEND_URL` | `https://flowdesk-api.onrender.com` | Your Render backend URL (no trailing slash) |
| `NEXT_PUBLIC_SOCKET_URL` | `https://flowdesk-api.onrender.com` | For real-time updates and chat |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kizmafwjqsjpfcuduaqp.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Your Supabase anon key)* | Found in Supabase > Project Settings > API |

5. Click **Deploy**.
6. Vercel will build and deploy the Next.js app in ~60 seconds!

---

## Step 3: Connect Frontend and Backend

1. Copy your Vercel URL (e.g. `https://flowdesk.vercel.app`).
2. Go back to Render &rarr; `flowdesk-api` &rarr; **Environment**.
3. Set `CLIENT_URL` to your Vercel URL: `https://flowdesk.vercel.app`.
4. Click **Save Changes** (Render will automatically re-deploy with CORS allowed).

---

## Instant Demo Credentials in Production

Once deployed, you can log in using:

- **Admin Account**:
  - Email: `admin@acme.com`
  - Password: `Password123!`
- **Manager Account**:
  - Email: `manager@acme.com`
  - Password: `Password123!`
- **Member Account**:
  - Email: `david@acme.com`
  - Password: `Password123!`

Or tap the **1-Click Demo Logins** on the login screen!
