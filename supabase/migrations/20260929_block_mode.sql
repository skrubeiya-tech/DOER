-- DOER mute & block (Sept 29, 2026)
-- mute: client-side only — I stop seeing them (mode='mute').
-- block: mutual and SERVER-ENFORCED — neither side's photos/clips reach the
-- other, whatever any client asks for (mode='block').

-- 1) user_blocks learns the difference
ALTER TABLE public.user_blocks
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'block';

-- 2) a security-definer helper so policies can read user_blocks
--    without fighting that table's own row security
CREATE OR REPLACE FUNCTION public.doer_block_between(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE ub.mode = 'block'
      AND ((ub.blocker = a AND ub.blocked = b)
        OR (ub.blocker = b AND ub.blocked = a))
  );
$$;

-- 3) blocked eyes see no moments and no wall clips, in either direction
DROP POLICY IF EXISTS blocked_eyes_moments ON public.moments;
CREATE POLICY blocked_eyes_moments ON public.moments
  AS RESTRICTIVE FOR SELECT
  USING (NOT public.doer_block_between(user_id, auth.uid()));

DROP POLICY IF EXISTS blocked_eyes_wall_clips ON public.wall_clips;
CREATE POLICY blocked_eyes_wall_clips ON public.wall_clips
  AS RESTRICTIVE FOR SELECT
  USING (NOT public.doer_block_between(user_id, auth.uid()));
