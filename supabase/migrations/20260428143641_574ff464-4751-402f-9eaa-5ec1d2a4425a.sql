
-- Profile table for platform users (separate from public marketing profiles)
CREATE TABLE IF NOT EXISTS public.platform_user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile"
  ON public.platform_user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own profile"
  ON public.platform_user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Workspace owners view all profiles"
  ON public.platform_user_profiles FOR SELECT
  TO authenticated
  USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Workspace owners manage profiles"
  ON public.platform_user_profiles FOR ALL
  TO authenticated
  USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_platform_user_profiles_updated_at
  BEFORE UPDATE ON public.platform_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on auth user signup
CREATE OR REPLACE FUNCTION public.handle_new_platform_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_user_profiles (user_id, email, display_name, must_change_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_platform_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_platform_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_platform_user();
