
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('user', 'admin');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER ROLES (separate table for security)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================
-- SECURITY DEFINER: has_role
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================
-- BOARDS
-- ============================================
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_boards_owner_id ON public.boards(owner_id);

-- ============================================
-- COLUMNS
-- ============================================
CREATE TABLE public.columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_columns_board_id ON public.columns(board_id);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  column_id UUID NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tasks_column_id ON public.tasks(column_id);

-- ============================================
-- LABELS
-- ============================================
CREATE TABLE public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TASK_LABELS (many-to-many)
-- ============================================
CREATE TABLE public.task_labels (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_task_labels_task_id ON public.task_labels(task_id);
CREATE INDEX idx_task_labels_label_id ON public.task_labels(label_id);

-- ============================================
-- BOARD_SHARES
-- ============================================
CREATE TABLE public.board_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (board_id, shared_with_user_id)
);
ALTER TABLE public.board_shares ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_board_shares_board_id ON public.board_shares(board_id);
CREATE INDEX idx_board_shares_shared_with ON public.board_shares(shared_with_user_id);

-- ============================================
-- ACTIVITY_LOGS
-- ============================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON public.columns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS POLICIES: PROFILES
-- ============================================
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================
-- RLS POLICIES: USER_ROLES
-- ============================================
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: BOARDS
-- ============================================
CREATE POLICY "Owners can manage own boards" ON public.boards FOR ALL TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Shared users can view boards" ON public.boards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.board_shares WHERE board_id = id AND shared_with_user_id = auth.uid()));
CREATE POLICY "Admins can view all boards" ON public.boards FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: COLUMNS
-- ============================================
CREATE POLICY "Board owners can manage columns" ON public.columns FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND owner_id = auth.uid()));
CREATE POLICY "Shared users can view columns" ON public.columns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.board_shares bs JOIN public.boards b ON b.id = board_id WHERE bs.board_id = b.id AND bs.shared_with_user_id = auth.uid()));
CREATE POLICY "Admins can view all columns" ON public.columns FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: TASKS
-- ============================================
CREATE POLICY "Board owners can manage tasks" ON public.tasks FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.columns c JOIN public.boards b ON b.id = c.board_id
    WHERE c.id = column_id AND b.owner_id = auth.uid()
  ));
CREATE POLICY "Shared users can view tasks" ON public.tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.columns c JOIN public.board_shares bs ON bs.board_id = c.board_id
    WHERE c.id = column_id AND bs.shared_with_user_id = auth.uid()
  ));
CREATE POLICY "Admins can view all tasks" ON public.tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: LABELS
-- ============================================
CREATE POLICY "All authenticated users can view labels" ON public.labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage labels" ON public.labels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: TASK_LABELS
-- ============================================
CREATE POLICY "Board owners can manage task labels" ON public.task_labels FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t JOIN public.columns c ON c.id = t.column_id JOIN public.boards b ON b.id = c.board_id
    WHERE t.id = task_id AND b.owner_id = auth.uid()
  ));
CREATE POLICY "Shared users can view task labels" ON public.task_labels FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t JOIN public.columns c ON c.id = t.column_id JOIN public.board_shares bs ON bs.board_id = c.board_id
    WHERE t.id = task_id AND bs.shared_with_user_id = auth.uid()
  ));
CREATE POLICY "Admins can view all task labels" ON public.task_labels FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: BOARD_SHARES
-- ============================================
CREATE POLICY "Board owners can manage shares" ON public.board_shares FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND owner_id = auth.uid()));
CREATE POLICY "Shared users can view own shares" ON public.board_shares FOR SELECT TO authenticated USING (shared_with_user_id = auth.uid());
CREATE POLICY "Admins can view all shares" ON public.board_shares FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: ACTIVITY_LOGS
-- ============================================
CREATE POLICY "Users can view own activity" ON public.activity_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own activity" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
