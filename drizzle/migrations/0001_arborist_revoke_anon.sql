REVOKE ALL ON FUNCTION public.arborist_can_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.arborist_can_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.arborist_photo_access(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_arborist_quote() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arborist_can_review(uuid), public.arborist_can_access(uuid, uuid), public.arborist_photo_access(text, boolean) TO authenticated;