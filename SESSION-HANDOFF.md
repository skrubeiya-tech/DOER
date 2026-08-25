# DOER — Session Handoff (2026-07-02)

Tell the new session: **"Read SESSION-HANDOFF.md and continue."** Your memory files
(`MEMORY.md` + `project_doer_redesign_v45.md`) also auto-load and contain most of this.

---

## 0. FIRST THING TO CHECK (the open question)

The user was verifying a fix on their **iPhone** and switched sessions before confirming.
Ask them / confirm:
1. What version shows at the bottom of the app? (should be **v0605-76**)
2. Is the **grey strip at the bottom of the screen gone?**

- If **v0605-76 and grey gone** → the bug is FIXED. Move on to whatever's next.
- If **v0605-76 and STILL grey** → the recolour isn't covering; get a fresh screenshot
  and inspect the exact bottom element. (Code search says `#6f6b63` is ONLY the body, so
  this would be surprising — re-verify what colour/element the strip actually is.)
- If **still v0605-74/75** → it just hasn't loaded the new version yet (see §5).

---

## 1. WHAT THE PROJECT IS

- **DOER**: a single-file React PWA (habit-aware calendar). 
- **Main file**: `/Users/rubeiya/doer claude code try/index.html`
  — one giant MINIFIED line. `CE = React.createElement`. Edit with Python heredoc scripts,
  always `assert s.count(anchor)==1` before `str.replace`. Do NOT hand-edit by eye.
- **Service worker**: `/Users/rubeiya/doer claude code try/sw.js` (network-first for HTML/JS).
- **Live site (GitHub Pages)**: https://skrubeiya-tech.github.io/DOER/
- **Git**: branch `main`; user `skrubeiya-tech`; remote redirects to
  `git@github.com:skrubeiya-tech/DOER.git` (a "repository moved" notice on push is harmless).
- **Current live version: v0605-76.**

---

## 2. THE CURRENT PROBLEM (what we were fixing)

A **grey strip at the bottom of the screen** on the user's iPhone — on EVERY screen
(Calendar/day view AND Challenges), and behind the Settings drawer.

**Verified root cause (searched the whole file):**
- The grey is the **body background `#6f6b63`** showing in the **iOS home-bar safe area**.
- `#6f6b63` appears in exactly ONE place: `body{margin:0;padding:0;background:#6f6b63}`
  (head `<style>`, ~byte 823). It's the desktop "phone-frame" colour.
- The app root (~byte 201139): `minHeight:"100vh",maxWidth:440,...,background:pageBg,paddingBottom:70`
  — `100vh` stops at the safe-area boundary on iOS, so the body shows below it.
- Fixed bottom bars: day-view ~byte 207318, challenges ~byte 146040 — both
  `position:fixed;bottom:0` with `padding-bottom:calc(8px+env(safe-area-inset-bottom))`.
  Their box bottom lands at the safe edge; home-bar below shows the body.
- Meta (verified present): `viewport-fit=cover`, `apple-mobile-web-app-status-bar-style:
  black-translucent`. No `theme-color`.
- ⚠️ **This CANNOT be reproduced in the desktop/preview** — `env(safe-area-inset-bottom)=0`
  there. Must be judged on the device. Do NOT blind-iterate (that wasted ~1h this session).

The **Settings drawer itself is fine** (fixed earlier via 110vh overshoot). Don't touch it.

---

## 3. FIXES SHIPPED THIS SESSION

- **v0605-75** — script before `</body>` sets `html`+`body` background to the theme page
  colour on phone widths (`window.innerWidth<=460`): `#F3F2EE` light / `#000000` dark /
  `#F15A23` neon (read from localStorage `doer_themeMode` / `doer_isDark`). Keeps `#6f6b63`
  on desktop (>460). Re-runs on resize/focus/visibilitychange + 700ms poll. → the home-bar
  strip blends into the app. VERIFIED in preview: body → `rgb(243,242,238)` cream at 375px.

- **v0605-76** — auto-updater script before `</body>`. On visibilitychange/focus/4s-after-load
  it fetches `index.html?cb=<ts>` (no-store), regexes the `v0605-N` stamp, and if it differs
  from the literal `CUR="v0605-76"` calls `location.reload()` ONCE (guarded by
  `sessionStorage["doerUpd_<tgt>"]` so it can never loop). → **After the user loads v76 once,
  future deploys apply themselves on next foreground; no more manual reload.**
  VERIFIED in preview: single navigation, no reload loop, no JS errors, recolour works.

---

## 4. DEPLOY PROCESS (exact)

```bash
cd "/Users/rubeiya/doer claude code try"
cp index.html "index.html.backup-before-<label>-$(date +%s)"   # always back up first
# edit index.html via: python3 - <<'PY' ... assert s.count(anchor)==1; s=s.replace(...) ... PY
# bump version — hits BOTH the day-view stamp AND CUR="v0605-N" (count is 2 now):
#   s.replace("v0605-OLD","v0605-NEW")
# bump sw.js:  doer-v0605-OLD -> doer-v0605-NEW
git add index.html sw.js
git commit -F - <<'MSG'
<subject>

<body>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
git push -q origin main    # ignore "repository moved" notice
# poll until live:
for i in $(seq 1 20); do V=$(curl -s "https://skrubeiya-tech.github.io/DOER/index.html?cb=$(date +%s%N)" | grep -o "v0605-[0-9]*" | head -1); [ "$V" = "v0605-NEW" ] && { echo LIVE; break; }; sleep 8; done
```

---

## 5. PREVIEW / VERIFY SETUP

- Start static server: `preview_start` with launch name **`serve (static)`** (python http.server 8000).
  The server dies often — just `preview_start` again. Use `preview_eval` / `preview_console_logs`.
- Preview opens on the **SIGN IN screen** (no session) — that's normal; the version stamp lives
  in the day-view footer so it won't appear in text on the auth screen.
- Theme flips to **dark** on reload → re-pin: `localStorage doer_themeMode='"light"'`,
  `doer_isDark='false'`, then reload.
- To test the recolour: `preview_resize` to mobile (≤460), then check
  `getComputedStyle(document.body).backgroundColor === "rgb(243, 242, 238)"` (cream).
- **iOS home-bar gap is NOT reproducible in preview** (env safe-area = 0). Judge on device.

---

## 6. USER'S STANDING RULES (do not violate)

- **Work only on looks, not logic.**
- **Keep dark mode as-is** — only change light / neon.
- **VERIFY / research against the real code before claiming a cause or shipping.** Do NOT guess.
  (This session's failure: I blind-patched the Settings drawer for ~1h when the gap was app-wide.)
- **Build the approved reference exactly** — don't substitute a "better" design.
- Normally: **get approval before deploying** ("push after I say"). During the gap crisis the
  user wanted immediate fixes — read the room.
- **Do NOT tell the user to delete website data.** (Auto-update now handles propagation.)
- Data rule: **changes apply from the day made forward, never retroactively.**
- The user gets very frustrated by wasted time and repetition — be decisive, verify, don't loop.

---

## 7. MEMORY (auto-loads each session)

- Index: `~/.claude/projects/-Users-rubeiya-doer-claude-code-try/memory/MEMORY.md`
- **Most relevant:** `project_doer_redesign_v45.md` — full detail on the settings drawer, radar
  work, and the v75/v76 home-bar fix + root cause + lessons + auto-update mechanism.
- Also: `feedback_check_dont_assume.md`, `feedback_build_approved_reference.md`,
  `project_doer_theme_system.md`, `project_doer_challenges_screen.md`,
  `feedback_measure_colors_dont_eyeball.md`, `project_doer_sync_rootcause.md`.

---

## 8. RECENT BACKUPS (this session, in project dir)

`index.html.backup-before-bodybg-*`, `index.html.backup-before-autoupdate-*`
(plus many older `index.html.backup-before-*`). To revert: copy one back over `index.html`.

## TODO (added Aug 25)
- [ ] NOVEMBER STORE BUILDS: soften the penguin push consent (v376 hard-block is PWA-only law) — in Capacitor/App Store + Play builds, allow tap-outside dismissal + re-ask later; Apple rejects apps that hard-require notification engagement (4.5.4/5.1.1). One-line gate where the backdrop onClick was removed.
- [ ] BEFORE OCT 1 LAUNCH: penguin push ask frequency — currently asks on EVERY app open until yeh (v377, right for beta/friends); at public launch soften to ONCE A DAY (re-add the doer_push_asked timestamp gate with a 1-day window in the pushAsk effect). Her call, Aug 25.
- [ ] NOVEMBER NATIVE BUILD: iOS communication notifications — penguin face as the SENDER AVATAR on lock-screen cards (INSendMessageIntent entitlement, like WhatsApp sender photos). Web push cannot do this; Apple only shows the app icon. Her ask Aug 25 ("i do not see the penguine in the lock screen").
- [ ] PHASE 2 / BRAIN: server-side delivery acks — compare pengpush sends vs client "heard" acks to detect phones where push silently dies (Chinese Android ROMs kill web push); penguin/server can then flag unreachable users. Client coach (v384) only covers delivered-but-untapped.
- [ ] LATER (her call, Aug 25): pet penguin visual polish — attempt ONE at a time with her approval on each, mockup/preview-first, never bundled: (1) white fringe + white patch between legs on night PNGs (Higgsfield cutout attempt exists: scratchpad hf-idle-night; fringe backups in repo), (2) baked floor shadows under feet, (3) opaque box behind carrot-night (opaque backup in repo), (4) dark-mode drop-shadow quality, (5) speech-bubble/penguin gap + tail. All were tried v386-390 and fully reverted at v391 per her order; pet is sacred ground until she reopens this.
- [x] DONE v394 (Aug 25): self-host Cormorant Garamond + Cinzel woff2 inside the repo (drop the Google Fonts link) so no device ever renders fallback fonts (her Pixel showed plain-serif numbers on first load, Aug 25); add files to SW PRECACHE. Also: one full design review ON ANDROID before launch - rendering is thinner/sharper there; check the places we tuned by thickness (wordmark icon, headers, heading weights).
- [ ] NOVEMBER (her ask Aug 25, agreed post-launch): big-screen layout rule - phones keep the locked iPhone-width layout untouched; screens wider than ~700px get a wide rule like WhatsApp does: wider column clamp, category cards 2-up side by side, roomier month cells. Mockup-first on her Fold before building. Pairs with App Store tablet screenshots.
