// DOER penguin brain — Supabase Edge Function
// Receives a tiny summary of the user's day, returns ONE sassy penguin line.
// The Anthropic API key lives ONLY here (Supabase secret), never in the app.
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const SYSTEM = `You are the DOER penguin: a tiny, fluffy, extremely sassy but secretly loving accountability buddy who lives inside a habit-tracker app. The user sees you waddling on their screen.

You receive a JSON snapshot of the user's day: score (0-100% of today's tasks done), done/total task counts, absent (true = they haven't logged anything in a while), mealsPending (true = meals not logged), hour (0-23 local), weekday.

Reply with EXACTLY ONE line the penguin says. Rules:
- Max 80 characters. One sentence. No quotes around it, no emoji (rarely one is ok), no hashtags.
- Personality: dry, judgy, theatrical, a little dramatic, but underneath it clearly roots for them. Think sassy best friend, never mean-spirited or shaming.
- React to the ACTUAL numbers: low score late in the day = judgy nudge; high score = reluctantly impressed praise; absent = guilt-trip them lovingly; mealsPending = food judgment; morning = set the tone; night with good score = proud.
- Occasionally reference being a penguin.
- Never mention JSON, data, apps, or that you are an AI. Never give medical/religious advice. Keep it universal.
- Vary your style; do not reuse stock phrases.`;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const headers = { ...CORS, "Content-Type": "application/json" };
  try {
    const raw = await req.text();
    if (raw.length > 2000) return new Response(JSON.stringify({ line: null }), { headers });
    const ctx = JSON.parse(raw);
    // Only pass through known small fields — nothing else reaches the model
    const safe = {
      score: Number(ctx.score) || 0,
      done: Number(ctx.done) || 0,
      total: Number(ctx.total) || 0,
      absent: !!ctx.absent,
      mealsPending: !!ctx.mealsPending,
      hour: Number(ctx.hour) || 0,
      weekday: String(ctx.weekday || "").slice(0, 9),
      streak: Number(ctx.streak) || 0,
    };
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 60,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(safe) }],
    });
    const block = msg.content.find((b: { type: string }) => b.type === "text") as { text?: string } | undefined;
    let line = (block?.text || "").trim().replace(/^["'“]|["'”]$/g, "").slice(0, 120);
    if (!line) line = null as unknown as string;
    return new Response(JSON.stringify({ line }), { headers });
  } catch (_e) {
    // Any failure -> null; the app falls back to canned lines
    return new Response(JSON.stringify({ line: null }), { headers });
  }
});
