
# Kanban Task Management System with Admin Dashboard

## Overview
A full-featured Kanban board app with drag-and-drop task management, team collaboration, and an admin dashboard — built on React + Supabase.

---

## 1. Database Schema & Migrations

### Core Tables
- **profiles** — `id` (FK to auth.users), `display_name`, `avatar_url`, `created_at`, `updated_at`
- **user_roles** — Separate table with `user_id`, `role` (enum: USER, ADMIN) to prevent privilege escalation
- **boards** — `id`, `name`, `owner_id`, `created_at`, `updated_at`
- **columns** — `id`, `name`, `board_id`, `order_index`, `created_at`, `updated_at`
- **tasks** — `id`, `title`, `description`, `due_date`, `priority` (enum: LOW, MEDIUM, HIGH), `column_id`, `order_index`, `created_at`, `updated_at`

### Bonus Tables
- **labels** — `id`, `name`, `color`, `created_at`
- **task_labels** — Many-to-many join table for tasks ↔ labels
- **board_shares** — `board_id`, `shared_with_user_id`, `permission` (read-only)
- **activity_logs** — `id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata` (JSONB), `created_at`

### Security
- Row-Level Security (RLS) on all tables
- `has_role()` security definer function for admin checks
- Auto-create profile + default USER role on signup via database trigger
- Cascading deletes on foreign keys
- Indexes on all foreign key columns

---

## 2. Authentication

- **Login & Register** pages using Supabase Auth (email/password)
- **Password reset** flow with dedicated `/reset-password` page
- Auth state managed via `onAuthStateChange` listener
- Protected routes for authenticated users and admin-only routes

---

## 3. User-Facing Features

### Boards
- Create, rename, and delete boards
- View boards list on a dashboard/home page
- Board sharing: invite users for read-only access

### Columns
- Add, rename, reorder, and delete columns within a board
- Drag-and-drop column reordering

### Tasks
- Create, edit, and delete tasks with title, description, due date, and priority
- **Drag-and-drop** tasks between columns and reorder within columns using @dnd-kit
- **Optimistic updates** via React Query mutations for instant UI feedback
- Assign labels to tasks (color-coded chips)
- Loading skeletons and error states throughout

### Form Validation
- All forms validated with Zod schemas (create/edit board, task, column, labels)

---

## 4. Admin Dashboard

Accessible only to users with ADMIN role, in a separate `/admin` route section:

- **Users management** — View all users, edit display names, delete accounts
- **Role management** — Grant or revoke ADMIN privileges
- **Boards overview** — View all boards across all users
- **Tasks overview** — View all tasks across all boards with filters
- **Labels management** — Create, edit, and delete system-wide labels
- **Activity logs** — View recent activity (task created/updated/deleted) with user, timestamp, and action details

### Admin Security
- Admin routes protected by role check (via `has_role()` function)
- Edge function for sensitive admin operations (user deletion, role changes) to enforce server-side authorization

---

## 5. Real-Time Updates

- Supabase Realtime subscriptions on tasks and columns tables
- When a teammate moves/creates/updates a task, the board updates live
- Activity log entries appear in real-time on the admin dashboard

---

## 6. Frontend Architecture

### Folder Structure
- `components/` — Reusable UI components (BoardCard, TaskCard, ColumnContainer, etc.)
- `components/admin/` — Admin-specific components (UserTable, ActivityFeed, etc.)
- `hooks/` — Custom hooks for boards, tasks, columns, auth, admin queries
- `services/` — API layer (Supabase client calls, organized by entity)
- `pages/` — Route pages (Dashboard, BoardView, Login, Register, Admin)
- `lib/validators/` — Zod schemas for form validation

### Pages
- `/login` — Login page
- `/register` — Registration page
- `/reset-password` — Password reset page
- `/` — Boards dashboard (list of user's boards)
- `/board/:id` — Kanban board view with columns and tasks
- `/admin` — Admin dashboard
- `/admin/users` — Users management
- `/admin/labels` — Labels management
- `/admin/activity` — Activity logs

---

## 7. Seed Data

A seed script will populate the database with:
- 2 sample users (1 admin, 1 regular)
- 2 boards with 3 columns each (To Do, In Progress, Done)
- Sample tasks with varying priorities
- A few labels (Bug, Feature, Urgent)
