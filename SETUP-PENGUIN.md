# AI Penguin — your 2 setup tasks (~10 minutes total)

Everything else is built. These two steps are the only ones that must be you
(they involve your payment card and your account passwords — I never touch those).

---

## Task 1 — Create the Anthropic API key and load $5 (~5 min)

1. Go to **https://console.anthropic.com** and sign up (use skrubeiya@gmail.com, any password).
2. In the left sidebar: **Billing** → **Buy credits** → buy the **$5** minimum.
   (This is the money the penguin spends. $5 ≈ several months of penguin talk for you.)
3. In the left sidebar: **API Keys** → **Create Key** → name it `doer-penguin`.
4. **Copy the key** (starts with `sk-ant-…`). You'll paste it in Task 2.
   ⚠️ Don't paste this key into chat, WhatsApp, notes apps, or the DOER code — only into the Supabase box in Task 2.
5. Optional but smart: **Settings → Limits** → set a **monthly spend limit** of $5,
   so even a bug could never overspend.

---

## Task 2 — Put the key + brain into Supabase (~5 min)

1. Go to **https://supabase.com/dashboard** and open the DOER project
   (the one whose URL is `zqhyygvrirgnlirsdzrf.supabase.co`).
2. Left sidebar → **Edge Functions** → **Deploy a new function** → choose
   **"Via Editor"** (create in browser).
3. Name it exactly: `penguin-brain`
4. Delete the sample code in the editor and paste in the ENTIRE contents of the file
   `supabase/functions/penguin-brain/index.ts` from this folder
   (I'll paste it in chat for you when you're ready — it contains NO secrets, it's safe to copy through chat).
5. Click **Deploy**.
6. Now the key: left sidebar → **Edge Functions** → **Secrets**
   (or Project Settings → Edge Functions → Secrets) → **Add secret**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: paste the `sk-ant-…` key from Task 1
   → Save.

---

## Then tell me "done"

I'll test the live brain end-to-end from the sandbox, show you the penguin
speaking real AI lines in the preview, and only then deploy the app update
(v0605-155) so it reaches your phone.

## Safety rails already built in (nothing for you to do)

- Penguin asks the brain **max 8 times/day per device**, min 90s apart
- Any error / no internet / no credits → penguin falls back to his current canned lines
- The key lives only in Supabase; phones never see it
- The brain only ever receives numbers (score, counts, hour) — never your task names,
  notes, or personal text
