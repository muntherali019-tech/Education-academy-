# ✅ Education Academy — completion checklist

A simple list of what's **already built** and the **steps left for you**. Tick things off as you go.

---

## Part A — Already built (no action needed) ✅

**Learning**
- [x] AI tutor (Mochi) with questions, explanations and spoken narration
- [x] Key Stages 1–3 + Higher Education across maths, English, science
- [x] Scan & solve (photo → steps) and Mark my homework (photo → feedback)
- [x] Built-in calculator
- [x] Advanced exam-prep courses with mock exams (revision aids, not certificates)
- [x] Offline fallback question bank + saved course questions

**Worldwide reach**
- [x] 8 languages, whole-app translation, right-to-left (Arabic) layout
- [x] First-launch language picker (auto-suggests the device language)
- [x] Local-currency pricing surfaced from the store

**Engagement & growth**
- [x] Daily streak + daily star goal ring
- [x] Daily Challenge (free, rotating bonus round)
- [x] Badges / achievements screen
- [x] Celebration confetti on great rounds
- [x] Mochi shop — buy fur colours, hats & glasses with stars
- [x] Share my score + Invite a friend (device share sheet)
- [x] Weekly family/class leaderboard (scoped by your account/class)
- [x] Referral rewards — inviter and new friend both get bonus stars
- [x] Daily reminder notifications (installed app)

**Accounts, payments, admin**
- [x] Parent/teacher area: progress, goals, weekly email summaries
- [x] Two separate builds: website (Stripe) and Android app (Google Play)
- [x] Stripe checkout + verified webhook + post-payment success screen
- [x] One-service web deploy (serves site + API together)
- [x] Optional Postgres so accounts survive restarts
- [x] Privacy, Terms, Support and Status pages + cookie notice (web)
- [x] App icons, splash, store-listing copy, in-app review prompt

---

## Part B — Your steps to go live ☐

### 1. Put the website online (≈30 min)
- [ ] Upload the project to **GitHub** (GitHub Desktop)
- [ ] Create a **Render** Blueprint from the repo (it reads `render.yaml`)
- [ ] Add `ANTHROPIC_API_KEY` (from console.anthropic.com)
- [ ] Set `PUBLIC_WEB_URL` to your live Render address
- [ ] Open your address — the app loads 🎉
👉 Full plain-language steps: **DEPLOY_WEBSITE.md**

### 2. Turn on payments (Stripe)
- [ ] Create **Junior** and **Adult** monthly products in Stripe
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_JUNIOR`, `STRIPE_PRICE_ADULT`
- [ ] Add a webhook to `https://your-address/api/stripe/webhook` and paste `STRIPE_WEBHOOK_SECRET`
- [ ] Test a purchase → you should see "You're all set!"
👉 Prices in other currencies: **PRICING.md**

### 3. Make accounts permanent (recommended)
- [ ] In Render: **New + → Postgres**, copy the connection string
- [ ] Add it as `DATABASE_URL` in the web service → Save

### 4. Weekly parent emails (optional)
- [ ] Create a sender account (e.g. Resend) and an API key
- [ ] Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, `WEEKLY_EMAILS_INPROCESS=1`

### 5. Fill in the legal pages
- [x] `marketing/privacy.html`, `terms.html` and `support.html` filled in (provider "Education Academy", contact muntherali019@gmail.com, England & Wales) — no bracketed placeholders remain
- [ ] Have a qualified person review them before taking live payments (add a postal address in the privacy policy if your jurisdiction requires one)

### 6. Build the Android app (when ready)
- [ ] `npm install` then `npm run build:app`
- [ ] `npx cap add android` → `npm run cap:sync`
- [ ] Install RevenueCat + set products; add `npm install @capacitor/local-notifications` for reminders
- [ ] Generate icons: `npx @capacitor/assets generate` (uses `resources/`)
- [ ] Create the Play listing (copy is in **STORE_LISTING.md**) and upload
👉 Full steps: **DEPLOYMENT.md**

### 7. Pre-launch polish
- [ ] Have a **native speaker** proof the translations and the Arabic (RTL) screens
- [ ] Confirm the package name `com.educationacademy.app` (permanent once published)
- [ ] Take store screenshots (suggested set listed in STORE_LISTING.md)
- [ ] Decide your prices and free-trial length

---

## Honest notes / known limits
- The build and payments **couldn't be run/tested in this environment** (no internet here) — everything is checked for correctness, but do a real test run after deploying.
- Translations and legal pages are **AI/templates** — review before launch.
- **Reminders** and **Play Billing** only work on the **installed app** (after the optional `npm install` packages). On the website, reminders are not used and payments go through Stripe.
- The data store is single-instance; for very large scale, keep `DATABASE_URL` set and run one instance (or move to a managed multi-instance DB).
- "Share/Invite" uses the real share sheet, and the **referral reward** (bonus stars for both the inviter and the new friend) is implemented server-side — it is granted once the invited account completes its first round.

You're in great shape — most of the heavy lifting is done. 🐱
