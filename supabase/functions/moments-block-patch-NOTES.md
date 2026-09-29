# moments Edge Function — block filter patch (Sept 29, 2026)

The moments function's full source lives only in the Supabase dashboard
(the browser's data-guard blocks extracting it, so it is not mirrored here).
Patched that day, in the dashboard editor, deployed at ~+495 chars:

- In the group listing op (the wall's `action: "bubbles"`), right after
  `const { data: moms } = await admin.from("moments").select(...).eq("group_id", gid).eq("approved", true)...;`
  the patch inserts:

      let momsSafe = moms || [];
      try { const { data: _bl } = await admin.from("user_blocks")
              .select("blocker,blocked").eq("mode", "block")
              .or("blocker.eq." + uid + ",blocked.eq." + uid);
            const _bad: Record<string, number> = {};
            for (const r of ((_bl || []) as Array<{ blocker: string; blocked: string }>)) {
              _bad[r.blocker === uid ? r.blocked : r.blocker] = 1; }
            momsSafe = momsSafe.filter((mm: { user_id: string }) => !_bad[mm.user_id]);
      } catch (_e) { /* blocks unreadable: show all */ }

  and the single downstream use `moms || []` became `momsSafe`.

- Verified end to end with a throwaway member: unblocked -> 1 bubble,
  blocked -> 0 bubbles, both directions mutual (mode='block' only;
  mutes are client-side and never reach this filter).
