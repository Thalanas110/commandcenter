-- ============================================================
-- COMPREHENSIVE FIX: ALL RECURSIVE RLS POLICIES → 500 ERRORS
-- ============================================================
-- Root cause: board_shares has a policy that queries board_shares
-- itself (infinite recursion). Every other table whose policy
-- joins board_shares (columns, categories, board_invites, tasks…)
-- inherits this recursion and returns HTTP 500.
--
-- Fix strategy:
--   1. Create a SECURITY DEFINER helper that checks board membership
--      WITHOUT triggering RLS (runs as the function owner).
--   2. Drop every recursive policy across all affected tables.
--   3. Recreate clean policies that use the helper instead.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- STEP 1: Safe membership helpers (SECURITY DEFINER bypasses RLS)
-- ────────────────────────────────────────────────────────────

-- Checks whether the current user is a member (shared_with_user_id)
-- of a given board. Safe: bypasses RLS so no recursion.
CREATE OR REPLACE FUNCTION public.is_board_member(_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.board_shares
    WHERE board_id = _board_id
      AND shared_with_user_id = auth.uid()
  );
$$;

-- Checks whether the current user is a member with a specific permission.
CREATE OR REPLACE FUNCTION public.is_board_editor(_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.board_shares
    WHERE board_id = _board_id
      AND shared_with_user_id = auth.uid()
      AND permission = 'editor'
  );
$$;

-- Checks whether the current user owns a given board.
CREATE OR REPLACE FUNCTION public.is_board_owner(_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.boards
    WHERE id = _board_id
      AND owner_id = auth.uid()
  );
$$;


-- ────────────────────────────────────────────────────────────
-- STEP 2: Fix board_shares policies (the root of recursion)
-- ────────────────────────────────────────────────────────────

-- Drop ALL existing board_shares SELECT policies
DROP POLICY IF EXISTS "Members can view board members"        ON public.board_shares;
DROP POLICY IF EXISTS "Shared users can view own shares"      ON public.board_shares;
DROP POLICY IF EXISTS "Board owners can view shares"          ON public.board_shares;
DROP POLICY IF EXISTS "Users can view their own share"        ON public.board_shares;

-- Non-recursive SELECT: owner check uses boards directly;
-- member check uses the SECURITY DEFINER helper (no RLS loop).
CREATE POLICY "board_shares_select" ON public.board_shares
  FOR SELECT TO authenticated
  USING (
    public.is_board_owner(board_id)        -- owner sees all shares
    OR public.is_board_member(board_id)    -- members see co-members
  );

-- Keep existing write policies (they only check boards, not board_shares)
-- Drop and recreate to be safe
DROP POLICY IF EXISTS "Board owners can manage shares"        ON public.board_shares;
DROP POLICY IF EXISTS "Board owners can insert shares"        ON public.board_shares;
DROP POLICY IF EXISTS "Board owners can delete shares"        ON public.board_shares;

CREATE POLICY "board_shares_all" ON public.board_shares
  FOR ALL TO authenticated
  USING (public.is_board_owner(board_id));


-- ────────────────────────────────────────────────────────────
-- STEP 3: Fix board_invites policies
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Board owners can manage invites"       ON public.board_invites;
DROP POLICY IF EXISTS "Admins can view all invites"           ON public.board_invites;

CREATE POLICY "board_invites_owner" ON public.board_invites
  FOR ALL TO authenticated
  USING (public.is_board_owner(board_id));

CREATE POLICY "board_invites_admin" ON public.board_invites
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ────────────────────────────────────────────────────────────
-- STEP 4: Fix columns policies
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Shared users can view columns"         ON public.columns;
DROP POLICY IF EXISTS "Editors can manage columns"            ON public.columns;
DROP POLICY IF EXISTS "Board owners can manage columns"       ON public.columns;
DROP POLICY IF EXISTS "Users can view their columns"          ON public.columns;

-- Owners can do everything
CREATE POLICY "columns_owner" ON public.columns
  FOR ALL TO authenticated
  USING (public.is_board_owner(board_id));

-- Members (viewers + editors) can read
CREATE POLICY "columns_member_select" ON public.columns
  FOR SELECT TO authenticated
  USING (public.is_board_member(board_id));

-- Editors can write
CREATE POLICY "columns_editor_write" ON public.columns
  FOR ALL TO authenticated
  USING (public.is_board_editor(board_id));

-- Admins can read everything
CREATE POLICY "columns_admin" ON public.columns
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ────────────────────────────────────────────────────────────
-- STEP 5: Fix categories policies
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Board owners can manage categories"    ON public.categories;
DROP POLICY IF EXISTS "Shared users can view categories"      ON public.categories;
DROP POLICY IF EXISTS "Admins can view all categories"        ON public.categories;

CREATE POLICY "categories_owner" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_board_owner(board_id));

CREATE POLICY "categories_member_select" ON public.categories
  FOR SELECT TO authenticated
  USING (public.is_board_member(board_id));

CREATE POLICY "categories_admin" ON public.categories
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ────────────────────────────────────────────────────────────
-- STEP 6: Fix tasks policies (they also join board_shares via columns)
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Shared users can view tasks"           ON public.tasks;
DROP POLICY IF EXISTS "ditors can manage tasks"               ON public.tasks;
DROP POLICY IF EXISTS "Editors can manage tasks"              ON public.tasks;

-- Helper: get the board_id from a column_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_column_board_id(_column_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT board_id FROM public.columns WHERE id = _column_id LIMIT 1;
$$;

CREATE POLICY "tasks_member_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.is_board_member(public.get_column_board_id(column_id)));

CREATE POLICY "tasks_editor_write" ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_board_editor(public.get_column_board_id(column_id)));


-- ────────────────────────────────────────────────────────────
-- STEP 7: Fix task_labels policies
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Shared users can view task labels"     ON public.task_labels;
DROP POLICY IF EXISTS "Editors can manage task labels"        ON public.task_labels;

-- Helper: get board_id from task_id
CREATE OR REPLACE FUNCTION public.get_task_board_id(_task_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.get_column_board_id(column_id)
  FROM public.tasks
  WHERE id = _task_id
  LIMIT 1;
$$;

CREATE POLICY "task_labels_member_select" ON public.task_labels
  FOR SELECT TO authenticated
  USING (public.is_board_member(public.get_task_board_id(task_id)));

CREATE POLICY "task_labels_editor_write" ON public.task_labels
  FOR ALL TO authenticated
  USING (public.is_board_editor(public.get_task_board_id(task_id)));


-- ────────────────────────────────────────────────────────────
-- Backwards compat: keep old helper name alive
-- ────────────────────────────────────────────────────────────
-- Must DROP first because the old version used a different param name (check_board_id)
-- and Postgres cannot rename params via CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.check_is_board_member(UUID);

CREATE OR REPLACE FUNCTION public.check_is_board_member(_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_board_member(_board_id);
$$;
