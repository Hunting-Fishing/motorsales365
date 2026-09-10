-- Explicit least-privilege hardening for projects with broad default grants.
REVOKE ALL ON SEQUENCE public.parts_receiving_exception_number_seq
  FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.parts_receiving_exception_number_seq TO service_role;

REVOKE ALL ON public.parts_receiving_exceptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.parts_receiving_exceptions TO authenticated;
GRANT ALL ON public.parts_receiving_exceptions TO service_role;

REVOKE ALL ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb)
  TO authenticated;

REVOKE ALL ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text)
  TO authenticated;
