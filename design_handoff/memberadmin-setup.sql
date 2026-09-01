-- DOER · group admin member management (v0605-507)
-- Paste this whole file into the Supabase SQL editor and Run.
-- It only ADDS permissions — it deletes nothing and touches no data.

-- 1) The group's creator (admin) may update membership rows in their own groups
--    (used for: remove member, approve rejoin, decline rejoin)
drop policy if exists "gc admin manage members" on public.group_members;
create policy "gc admin manage members" on public.group_members
for update to authenticated
using (exists (select 1 from public.group_challenges g
               where g.id = group_id and g.created_by = auth.uid()))
with check (exists (select 1 from public.group_challenges g
                    where g.id = group_id and g.created_by = auth.uid()));

-- 2) A member may update their own row
--    (used for: a removed member sending a rejoin request = status 'pending')
drop policy if exists "gm self update v2" on public.group_members;
create policy "gm self update v2" on public.group_members
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
