// DOER account scrub — erases a user's account and every trace of their data.
// Called by the app's Delete Account flow with the user's own access token.
// The service-role key lives ONLY here (Supabase hands it to Edge Functions).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const headers = { ...CORS, "Content-Type": "application/json" };
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return new Response(JSON.stringify({ ok: false, error: "no token" }), { status: 401, headers });
    let body: { confirm?: string } = {};
    try { body = JSON.parse(await req.text() || "{}"); } catch (_e) { body = {}; }
    if (body.confirm !== "DELETE") {
      return new Response(JSON.stringify({ ok: false, error: "unconfirmed" }), { status: 400, headers });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: ud, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !ud?.user) {
      return new Response(JSON.stringify({ ok: false, error: "bad token" }), { status: 401, headers });
    }
    const uid = ud.user.id;

    // 1) Storage: everything the user uploaded lives under "<uid>/..." in the moments bucket
    //    (day photos, thumbnails, winning-wall clips). Best effort — rows and auth still go.
    try {
      const paths: string[] = [];
      const walk = async (prefix: string) => {
        const { data: items } = await admin.storage.from("moments").list(prefix, { limit: 1000 });
        for (const it of items || []) {
          const p = prefix ? prefix + "/" + it.name : it.name;
          if (it.id === null) await walk(p);
          else paths.push(p);
        }
      };
      await walk(uid);
      for (let i = 0; i < paths.length; i += 100) {
        await admin.storage.from("moments").remove(paths.slice(i, i + 100));
      }
    } catch (_e) { /* continue */ }

    // 2) Groups the user hosts die with the host — clear their members' rows first.
    try {
      const { data: myGroups } = await admin.from("group_challenges").select("id").eq("created_by", uid);
      const gids = (myGroups || []).map((g: { id: string }) => g.id);
      if (gids.length) {
        await admin.from("group_progress").delete().in("group_id", gids);
        await admin.from("group_members").delete().in("group_id", gids);
        await admin.from("moments").delete().in("group_id", gids);
      }
    } catch (_e) { /* continue */ }

    // 3) The user's own rows, children first.
    const del = (t: string, c: string) => admin.from(t).delete().eq(c, uid);
    await del("moments", "user_id");
    await del("wall_clips", "user_id");
    await del("group_progress", "user_id");
    await del("group_members", "user_id");
    await del("push_subs", "user_id");
    await del("touched_keys", "user_id");
    await del("year_data", "user_id");
    await del("user_settings", "user_id");
    await del("user_blocks", "blocker");
    await del("user_blocks", "blocked");
    await del("content_flags", "reporter");
    await del("group_challenges", "created_by");
    await del("profiles", "id");

    // 4) The account itself.
    const { error: derr } = await admin.auth.admin.deleteUser(uid);
    if (derr) {
      console.error("scrub-authfail", derr.message || String(derr));
      return new Response(JSON.stringify({ ok: false, error: "auth delete failed" }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (_e) {
    console.error("scrub-fail", _e instanceof Error ? _e.message : String(_e));
    return new Response(JSON.stringify({ ok: false, error: "scrub failed" }), { status: 500, headers });
  }
});
