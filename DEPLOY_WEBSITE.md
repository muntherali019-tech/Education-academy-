# Put Education Academy online — the easy way 🚀

This guide puts your **website** on the internet. A helper called **Render** does the hard build work for you, so you don't need to be a computer expert. Just follow the steps in order. ☕

You only need three things, all free to start:
1. A **GitHub** account (a place to keep your code).
2. A **Render** account (the helper that runs your website).
3. A **Stripe** account (so people can pay you). You can do Stripe last.

---

## Part 1 — Put your code on GitHub (about 10 minutes)

1. Go to **github.com** and click **Sign up**. Make a free account.
2. Click the **+** at the top-right, then **New repository**.
3. Give it a name like `education-academy`. Choose **Private**. Click **Create repository**.
4. On your computer, download **GitHub Desktop** from **desktop.github.com** and sign in.
5. In GitHub Desktop: **File → Add local repository**, then pick this project's folder (the one with `package.json` inside).
6. Click **Publish** (or **Push**). Your code is now safely on GitHub. ✅

> Tip: there is a file called `.gitignore`. It quietly leaves out big folders you don't need to upload. That's normal — leave it alone.

---

## Part 2 — Turn it into a website with Render (about 10 minutes)

1. Go to **render.com** and click **Get Started**. Sign up using your **GitHub** account (easiest).
2. Click **New +** (top-right) → **Blueprint**.
3. Pick your `education-academy` repository from the list. Render will find the `render.yaml` file and set everything up for you. 🎉
4. It will ask you to fill in some **secret keys**. Type them in (where to find each one is in **Part 3**). If you don't have the Stripe ones yet, you can put anything for now and fix them later — payments just won't work until you do.
   - `ANTHROPIC_API_KEY` — makes Mochi the AI tutor work.
   - `PUBLIC_WEB_URL` — your website address. You won't know it yet! Put `https://example.com` for now and change it in step 6.
5. Click **Apply** / **Create**. Render now builds your website. This takes a few minutes — go get a snack. 🍪
6. When it's done, Render shows your website address at the top, like `https://education-academy.onrender.com`. 
   - Copy that address.
   - Go to **Environment** on the left, find **PUBLIC_WEB_URL**, paste your real address, and **Save**. It will rebuild once more.

**Open your address in a browser — your website is live!** 🌍

---

## Part 3 — Where to get each secret key

Think of these like passwords you copy and paste into Render's **Environment** page.

**Mochi the AI tutor**
- `ANTHROPIC_API_KEY` — sign in at **console.anthropic.com**, go to **API Keys**, click **Create key**, copy it.

**Payments (Stripe)** — do this when you're ready to take money:
1. Sign in at **dashboard.stripe.com**.
2. Make two **Products** (click **Product catalogue → Add product**):
   - "Junior" with a **monthly** price (for example £3).
   - "Adult" with a **monthly** price (for example £5).
3. Open each price and copy its **price ID** (it looks like `price_123abc`).
   - Put the Junior one in `STRIPE_PRICE_JUNIOR`.
   - Put the Adult one in `STRIPE_PRICE_ADULT`.
4. Get your secret key: **Developers → API keys → Secret key** → copy into `STRIPE_SECRET_KEY`.
5. Tell Stripe where to send payment news (the "webhook"):
   - Go to **Developers → Webhooks → Add endpoint**.
   - For the URL, type your website address then `/api/stripe/webhook`, like:
     `https://education-academy.onrender.com/api/stripe/webhook`
   - For events, choose **checkout.session.completed**, **customer.subscription.updated**, and **customer.subscription.deleted**.
   - Click **Add endpoint**, then copy the **Signing secret** (starts with `whsec_`) into `STRIPE_WEBHOOK_SECRET`.
6. Back in Render, **Save** the environment changes. Done! 💳

> Want prices in dollars, euros, rupees, etc.? Open `PRICING.md` — it tells you exactly where to click. Stripe and Google Play show each person their own currency automatically.

---

## Part 4 — The phone app is separate (do this later)

Your **website** and your **Android app** are two different builds on purpose. This guide was for the **website**. When you want the **Google Play app**, open **DEPLOYMENT.md** — it walks through `npm run build:app`, wrapping it with Capacitor, and uploading to Google Play. The app uses Google Play for payments; the website uses Stripe. You don't have to do both at once.

---

## Is it working? Quick checklist ✅

- Opening your Render address shows the app with **Mochi**.
- Pick a stage and start a quiz — questions appear (this proves the AI key works).
- Tap **Subscribe** — it should send you to a Stripe payment page (this proves Stripe works).
- After a test payment, you come back and see **"You're all set!"**.

If a step doesn't work, it's almost always a key that's typed wrong or missing in Render's **Environment** page. Check there first, **Save**, and let it rebuild.

You did it! 🐱🎉

---

## Already included for you ✅
- **Privacy, Terms and Support pages** are live automatically at `/privacy`, `/terms`, and `/support` on your website. Open `marketing/terms.html` and `marketing/support.html` and replace the **[bracketed]** bits (your name, contact email, country) before you launch. Stripe and Google Play will ask for these page links — just use `https://your-address/privacy` and `/terms`.

## Optional: make accounts never disappear (for bigger hosts)
On Render's free plan, files can reset when the app restarts. If you want accounts to be permanent:
1. In Render, click **New + → Postgres** and create a free database. Copy its **Internal Connection String**.
2. In your web service's **Environment**, add `DATABASE_URL` and paste that string. **Save**.
3. That's it — the app will use the database automatically. (The build already includes the `pg` driver as an optional install.)

If you don't do this, everything still works; accounts just live in a file that's best kept on a host with a persistent disk.

## Optional: turn on weekly progress emails to parents
The app can email parents a weekly summary. To switch it on:
1. Make a free account at a sender like **Resend** (resend.com) and create an API key.
2. In Render's **Environment**, add:
   - `EMAIL_PROVIDER` = `resend`
   - `RESEND_API_KEY` = your key
   - `EMAIL_FROM` = `Education Academy <hello@your-domain>` (use a sender you've verified)
   - `WEEKLY_EMAILS_INPROCESS` = `1`  (this sends them automatically once a day)
3. Save. Parents who switch on weekly emails in the Grown-ups area will start receiving them.

(If you'd rather control the timing precisely, leave `WEEKLY_EMAILS_INPROCESS` off and have any scheduler call `POST /api/cron/weekly-reports` with the `x-cron-secret` header set to your `CRON_SECRET`.)

## Handy links once live
- Your app: `https://your-address/`
- Status page: `https://your-address/status`
- Privacy / Terms / Support: `/privacy`, `/terms`, `/support`
