// DOER feed — Home-tab proof feed (Oct 16, 2026)
// POST { group_id } with the user's own JWT.
// Returns { items: [{ id, url, day, mine, name, task, created_at, user_id }] }
// - caller must be a member of the group (or the group is public and they are a member row)
// - only approved moments, today + yesterday
// - mutual blocks filtered server-side (mode='block'), same as the moments fn
// - names come from group_members; for public (community) groups names are withheld
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL0 = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};
const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const admin = createClient(URL0, SRV);
    const { data: ures } = await createClient(URL0, ANON, {
      global: { headers: { Authorization: auth } },
    }).auth.getUser();
    const uid = ures?.user?.id;
    if (!uid) return j({ error: "sign in" }, 401);

    const { group_id } = await req.json().catch(() => ({}));
    if (!group_id) return j({ error: "no group" }, 400);

    const { data: grp } = await admin.from("group_challenges")
      .select("id,start_date,is_public").eq("id", group_id).maybeSingle();
    if (!grp) return j({ error: "no group" }, 404);

    const { data: mems } = await admin.from("group_members")
      .select("user_id,name").eq("group_id", group_id);
    const memMap: Record<string, string> = {};
    for (const m of mems || []) memMap[m.user_id] = m.name || "";
    if (!memMap[uid]) return j({ error: "not a member" }, 403);

    // today + yesterday, approved only
    const d0 = new Date(); const d1 = new Date(d0.getTime() - 86400000);
    const dk = (d: Date) => d.toISOString().slice(0, 10);
    const { data: moms } = await admin.from("moments")
      .select("id,user_id,date,path,task,created_at")
      .eq("group_id", group_id).eq("approved", true)
      .in("date", [dk(d0), dk(d1)])
      .order("created_at", { ascending: false }).limit(40);

    // mutual blocks, both directions
    let safe = moms || [];
    try {
      const { data: bl } = await admin.from("user_blocks")
        .select("blocker,blocked").eq("mode", "block")
        .or("blocker.eq." + uid + ",blocked.eq." + uid);
      const bad: Record<string, number> = {};
      for (const r of (bl || []) as Array<{ blocker: string; blocked: string }>) {
        bad[r.blocker === uid ? r.blocked : r.blocker] = 1;
      }
      safe = safe.filter((m: { user_id: string }) => !bad[m.user_id]);
    } catch (_e) { /* blocks unreadable: show all */ }

    // day number from the group's start date
    let dayN: number | null = null;
    try {
      const sd = new Date(grp.start_date + "T00:00:00Z");
      dayN = Math.floor((Date.parse(dk(d0) + "T00:00:00Z") - sd.getTime()) / 86400000) + 1;
    } catch (_e) { /* no day */ }

    const items = [];
    for (const m of safe) {
      const { data: sig } = await admin.storage.from("moments")
        .createSignedUrl(m.path, 3600);
      if (!sig?.signedUrl) continue; // dead path: drop silently
      items.push({
        id: m.id,
        url: sig.signedUrl,
        day: dayN,
        mine: m.user_id === uid,
        name: grp.is_public ? null : (memMap[m.user_id] || null),
        task: m.task || null,
        created_at: m.created_at,
        user_id: m.user_id,
      });
    }
    return j({ items });
  } catch (e) {
    return j({ error: String((e as Error)?.message || e) }, 500);
  }
});
