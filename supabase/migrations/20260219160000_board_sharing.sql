-- ============================================
-- BOARD INVITES
-- ============================================
CREATE TABLE public.board_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')) DEFAULT 'viewer',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  usage_limit INTEGER, -- NULL means unlimited
  expires_at TIMESTAMPTZ, -- NULL means never expires
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.board_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_board_invites_board_id ON public.board_invites(board_id);
CREATE INDEX idx_board_invites_token ON public.board_invites(token);


-- ============================================
-- RLS POLICIES: BOARD_INVITES
-- ============================================
-- Only board owners (and admins) can view/manage invites for their boards
CREATE POLICY "Board owners can manage invites" ON public.board_invites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boards WHERE id = board_invites.board_id AND owner_id = auth.uid()));

CREATE POLICY "Admins can view all invites" ON public.board_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- UPDATE BOARD_SHARES Constraint
-- ============================================
-- Only allow 'viewer' or 'editor' roles
ALTER TABLE public.board_shares
  ADD CONSTRAINT check_board_share_permission CHECK (permission IN ('viewer', 'editor'));


-- ============================================
-- FUNCTION: join_board_via_token
-- ============================================
CREATE OR REPLACE FUNCTION public.join_board_via_token(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.board_invites%ROWTYPE;
  _board_id UUID;
  _role TEXT;
  _user_id UUID;
  _existing_share UUID;
BEGIN
  _user_id := auth.uid();
  
  -- 1. Find the invite
  SELECT * INTO _invite FROM public.board_invites WHERE token = _token;
  
  IF _invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid invite token');
  END IF;

  -- 2. Check expiration
  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invite expired');
  END IF;

  -- 3. Check usage limit
  IF _invite.usage_limit IS NOT NULL AND _invite.usage_count >= _invite.usage_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invite usage limit reached');
  END IF;

  _board_id := _invite.board_id;
  _role := _invite.role;

  -- 4. Check if user is already a member
  SELECT id INTO _existing_share FROM public.board_shares 
  WHERE board_id = _board_id AND shared_with_user_id = _user_id;

  IF _existing_share IS NOT NULL THEN
    -- User already member, maybe update role if different?
    -- For now, just return success
    RETURN jsonb_build_object('success', true, 'board_id', _board_id, 'message', 'Already a member');
  END IF;

  -- 5. Add user to board_shares
  INSERT INTO public.board_shares (board_id, shared_with_user_id, permission)
  VALUES (_board_id, _user_id, _role);

  -- 6. Increment usage count
  UPDATE public.board_invites SET usage_count = usage_count + 1 WHERE id = _invite.id;

  RETURN jsonb_build_object('success', true, 'board_id', _board_id);
END;
$$;


-- ============================================
-- UPDATE RLS POLICIES FOR 'EDITOR' ACCESS
-- ============================================

-- TASKS: Editors can insert/update/delete
DROP POLICY IF EXISTS "Shared users can view tasks" ON public.tasks;
CREATE POLICY "Shared users can view tasks" ON public.tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.columns c JOIN public.board_shares bs ON bs.board_id = c.board_id
    WHERE c.id = tasks.column_id AND bs.shared_with_user_id = auth.uid()
  ));

CREATE POLICY "ditors can manage tasks" ON public.tasks FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.columns c JOIN public.board_shares bs ON bs.board_id = c.board_id
    WHERE c.id = tasks.column_id AND bs.shared_with_user_id = auth.uid() AND bs.permission = 'editor'
  ));


-- COLUMNS: Editors can insert/update (maybe not delete?)
-- Let's allow editors to fully manage columns for now
DROP POLICY IF EXISTS "Shared users can view columns" ON public.columns;
CREATE POLICY "Shared users can view columns" ON public.columns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.board_shares bs JOIN public.boards b ON b.id = board_id WHERE bs.board_id = b.id AND bs.shared_with_user_id = auth.uid()));

CREATE POLICY "Editors can manage columns" ON public.columns FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.board_shares bs WHERE bs.board_id = columns.board_id AND bs.shared_with_user_id = auth.uid() AND bs.permission = 'editor')
  );

-- TASK LABELS
DROP POLICY IF EXISTS "Shared users can view task labels" ON public.task_labels;
CREATE POLICY "Shared users can view task labels" ON public.task_labels FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t JOIN public.columns c ON c.id = t.column_id JOIN public.board_shares bs ON bs.board_id = c.board_id
    WHERE t.id = task_labels.task_id AND bs.shared_with_user_id = auth.uid()
  ));

CREATE POLICY "Editors can manage task labels" ON public.task_labels FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t JOIN public.columns c ON c.id = t.column_id JOIN public.board_shares bs ON bs.board_id = c.board_id
    WHERE t.id = task_labels.task_id AND bs.shared_with_user_id = auth.uid() AND bs.permission = 'editor'
  ));

