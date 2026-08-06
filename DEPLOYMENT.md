# Education Academy — Deployment Guide (Google Play)

This is the ordered checklist to get from the current project to a live app on the
Google Play Store. Each step is tagged:

- **[CODE ✓]** — already implemented in this project.
- **[YOU]** — needs your own accounts, money, keys, or hosting. I can't do these from here, but each step says exactly what to do.

> Honest summary: the **app, AI features, accounts, cross-device sync, parent/teacher portals, goals/tasks, and theming are built**. **Payments are scaffolded but not live**, and **publishing requires your Google account, a signing key, a hosted backend, and a privacy policy.** Work top to bottom.

---

## 0. What's built vs what's left

| Area | Status |
|---|---|
| Learning game, 15-Q rounds, 4 stages, subjects | [CODE ✓] |
| AI homework marking + scan & solve (via your API key) | [CODE ✓] |
| Accounts (parent / teacher), login, signed tokens | [CODE ✓] |
| Cross-device sync (progress follows a child) | [CODE ✓] |
| Parent portal: child health, goals/tasks, AI suggestions | [CODE ✓] |
| Teacher portal: classes, pupils, goals/tasks, AI suggestions | [CODE ✓] |
| Separate parent vs teacher goal tracks | [CODE ✓] |
| Per-key-stage inspirational theming | [CODE ✓] |
| Marketing website | [CODE ✓] (`marketing/index.html`) |
| Billing **abstraction** + integration points | [CODE ✓] |
| **Live payments** (Play Billing products + server verification) | [YOU] |
| Production database (swap the dev JSON store) | [YOU] |
| Hosted backend (the API + AI proxy) | [YOU] |
| Android build signing key (keystore) | [YOU] |
| Play Console account, listing, ratings, data safety | [YOU] |
| Privacy policy URL | [YOU] |

---

## 1. Run it locally  [CODE ✓ — you just run it]

```bash
cd Education-academy-
npm install
cp .env.example .env        # then paste your Anthropic API key into .env
npm start                   # runs the web app (5173) + API (8787) together
```

Open http://localhost:5173. Try: play a round, open **Grown-ups → Parent & Teacher portal**, create a parent account, add a child, set a goal, tap **Suggest with AI**.

> The dev backend stores data in `server/data/db.json`. Great for testing; not for production (see step 2).

---

## 2. Make the backend production-ready  [YOU]

The app needs the backend online for AI, accounts and sync. Two things to do:

**2a. Replace the dev data store with a real database.**
`server/store.js` is a JSON file and `server/auth.js` uses HMAC tokens — fine for local dev, **not safe for production at scale.** Recommended: move auth + data to a managed service.

- Easiest path: **Supabase** or **Firebase** (managed Postgres/Firestore + auth + hosting). They handle password security, email verification, and scaling for you.
- The route handlers in `server/index.js` are the only place that touches the store, so you swap the `load/save` helpers (and the auth functions) for your provider's SDK.

**2b. Deploy the backend.** Host `server/` on Render, Railway, Fly.io, Cloud Run, or similar. Set environment variables there:

```
ANTHROPIC_API_KEY=sk-ant-...     # your key (kept server-side, never in the app)
AUTH_SECRET=<long random string> # only if you keep the built-in token auth
PORT=8787
ELEVENLABS_API_KEY=...           # optional: enables Mochi's premium cloud voice
ELEVENLABS_VOICE_ID=...          # optional: a child-friendly voice from your account
```

> **Optional — premium voice:** the app ships with a free on-device voice. To use a premium cloud voice, add the ElevenLabs keys above, set `VITE_TTS=cloud` at build time, and the `/api/tts` proxy handles it (with automatic fallback to the on-device voice). Speaking practice uses the browser's built-in speech recognition and needs no key.

**2c. Point the app at it.** Set `VITE_API_BASE` to your deployed API URL (e.g. `https://api.educationacademy.app/api`) in a `.env` used at build time, then rebuild. Add rate limiting and HTTPS.

---

## 3. Real payments — Google Play Billing  [YOU]  (app side is [CODE ✓])

Today the app uses a **mock** unlock so you can build the experience. To take real money you must:

**3a. Create subscription products in the Play Console** with IDs matching `src/lib/billing.js`:
- `whisker_junior_monthly` — £3/mo (KS1 & KS2)
- `whisker_adult_monthly` — £5/mo (KS3 & Higher Education)

**3b. Add billing to the Android app.** The simplest cross-platform path is **RevenueCat** (it wraps Google Play Billing and, later, Apple StoreKit, and verifies purchases for you):
```bash
npm install @revenuecat/purchases-capacitor
npx cap sync
```
Then `src/lib/billing.js` **already implements RevenueCat** (configure, offerings, purchase, restore); the app refreshes entitlements on launch and shows **Restore purchases** on the Plans screen. You just: install the plugin (above), set `VITE_BILLING=revenuecat` and `VITE_REVENUECAT_KEY`, and in the RevenueCat dashboard map your products to entitlements named `junior` and `adult`.

**3c. Verify purchases server-side.** Don't trust the client. Either let RevenueCat be your source of truth (recommended) **or** verify with the **Google Play Developer API** using a Google Cloud **service account**, and store entitlements against the user. Update the child/account record so the app reads real entitlements instead of the mock.

**3d. Parental gate.** Because this is a children's app, a purchase must sit **behind a parental gate** (a quick grown-up check). The portal's grown-up area is the right place to trigger purchase flows.

**3e. Free trial.** The app grants a **72-hour trial** locally (`src/lib/trial.js`) so new users can explore before paying. For store-billed trials, also add a **3-day free trial** introductory offer to each subscription in the Play Console — RevenueCat surfaces it automatically.

> **Advanced courses are revision aids, not qualifications.** The Courses area is exam-prep aligned to Gas/Electrical/Renewable/Business subject areas. Do **not** market it as accredited training or certification — keep the in-app disclaimer intact.

> Fees to expect on Google Play: **15%** on your first \$1M of earnings each year, and **15% on subscriptions from day one** (no enrolment needed). Above \$1M/year it's 30%.

---

## 4. Build the Android app with Capacitor  [CODE ✓ config — you run + sign]

```bash
npm run build          # builds the web app into dist/
npm run cap:add        # one-time: adds the native android/ project
npm run cap:sync       # copies the web build + plugins into android/
npm run cap:open       # opens Android Studio
```

In Android Studio:
- Set the app name, icon, and version.
- **Generate a signing key (keystore)** — *keep it safe forever; you cannot update the app without it.*
- Build a signed **Android App Bundle (.aab)**: *Build → Generate Signed Bundle/APK → Android App Bundle.*

> The app id is `com.educationacademy.app` (in `capacitor.config.json`). Change it before first upload if you want a different package name — it's permanent once published.

---

## 5. Play Console setup  [YOU]

1. **Create a Google Play Developer account** — one-time **\$25** registration fee.
2. **Create the app**, then complete every section Play asks for:
   - **Store listing**: title, short & full description, screenshots, feature graphic, icon (see step 8).
   - **Content rating (IARC questionnaire)** — answer honestly; an educational kids app rates very low.
   - **Target audience and content**: select that children are in the audience → this opts you into **Google Play Families ("Designed for Families")** requirements.
   - **Data safety form**: declare what you collect (account email, progress). For a kids app, declare **no third-party advertising or analytics SDKs**.
   - **App access**: give Google test credentials for a parent and a teacher account so reviewers can see the portals.
   - **Privacy policy URL** (required — see step 6).
   - **Ads declaration**: select **"No, my app does not contain ads."**
3. Upload your signed **.aab** to a testing track (step 9).

---

## 6. Compliance for a children's app  [YOU — design rules already followed]

Children's apps are held to stricter rules on **both** stores. Build to the strictest:

- **No third-party advertising and no third-party analytics** in a kids app. No behavioural/targeted ads. (This app ships with none — keep it that way.)
- **No personal or device identifiers sent to third parties.**
- **A privacy policy is required**, written plainly, covering what you collect (email, child name, progress) and how parents can request deletion.
- **Parental gate** before any purchase or link out of the app.
- **Laws that apply**: COPPA (US), the **UK Age-Appropriate Design Code (Children's Code)** and UK/EU GDPR-K. Get verifiable parental consent where required.
- **2026 age-assurance**: new US state laws (e.g. Utah, Texas, Louisiana) and platform age-signal APIs are rolling out. Google provides age-signal handling for users in applicable US states in the Play Console — review and enable as prompted.

> Treat the above as a starting checklist, not legal advice — confirm current store policy and, for a paid children's product, get a lawyer to review your privacy policy.

---

## 7. The website  [CODE ✓]

You already have two web deliverables:

1. **The app itself is a website.** `npm run build` produces `dist/` — deploy that folder to any static host (Vercel, Netlify, Cloudflare Pages, Firebase Hosting). That's your playable web app. Remember to set `VITE_API_BASE` to your hosted API before building.
2. **The marketing site** is `marketing/index.html` — a standalone landing page. Host it at your root domain and update the links at the bottom of the file (`webapp`, `googleplay`, `privacy`, `terms`, `support`).

---

## 8. Store listing & ASO assets  [YOU]

These drive discovery and installs more than anything else:
- **App icon** (Mochi), **feature graphic** (1024×500), and **phone screenshots** showing: a round in play, AI marking, the parent dashboard, the teacher class view.
- **Title + short description**: lead with what parents search — e.g. "Education Academy: Kids Learning" / "Maths, English & science for KS1–KS3, marked by a friendly cat."
- **Full description**: outcomes first (curriculum coverage, homework help, progress tracking), then features.
- **Localise** the listing for the UK and any EU markets you target.

---

## 9. Testing → release  [YOU]

1. **Internal testing** track first (just you and a few devices). Confirm AI, accounts, sync, and a real test purchase all work end-to-end against your **deployed** backend.
2. **Closed testing** with a small group of real parents/teachers. Fix what they trip over.
3. **Open testing** (optional) for a public beta.
4. **Production** with a **staged rollout** (e.g. 10% → 50% → 100%) so you can halt if something breaks.

---

## 10. After launch  [YOU + some CODE hooks]

- **Ratings**: prompt for a review after a positive moment using the **Google Play In-App Review API** — but show it to the **grown-up**, not the child.
- **Analytics**: use a **kids-safe**, privacy-respecting analytics approach only; never a third-party ad/analytics SDK in the child experience.
- **Retention**: keep content fresh, lean on streaks and the parent/teacher goals, and send **progress summaries to parents** (a natural next feature to build on the portal).
- **Monitor** crashes and API errors; iterate from real usage and reviews.

---

## Quick "is it ready?" checklist

- [ ] Backend deployed; `VITE_API_BASE` points to it; dev JSON store replaced.
- [ ] AI works in production (API key set server-side).
- [ ] Subscription products created in Play Console; billing wired and **verified server-side**; mock disabled (`VITE_BILLING=revenuecat`).
- [ ] Parental gate in front of purchases.
- [ ] Privacy policy published; Data safety form complete; ads = none.
- [ ] Signed `.aab` built with a keystore you've safely backed up.
- [ ] Target audience = children; Families policy requirements met.
- [ ] Listing assets uploaded; tested via internal → closed → production.

## Separate web vs app builds
- **Web:** `npm run build:web` → deploy `dist-web/` to your host. Set Stripe env vars on the Express server (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_JUNIOR`, `STRIPE_PRICE_ADULT`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_WEB_URL`) and point a Stripe webhook at `POST /api/stripe/webhook` (grant/revoke the user's plan there).
- **App:** `npm run cap:sync` (uses `build:app` → `dist-app/`), then `npm run cap:open` to build the AAB in Android Studio. Configure RevenueCat (`VITE_REVENUECAT_KEY`) and the Play subscriptions. Local currency is handled by Google Play.
- See `PRICING.md` for per-country price overrides.
