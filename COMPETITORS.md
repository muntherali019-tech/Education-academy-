# Education Academy vs the market — comparison & action plan

Researched June 2026. Figures are from public write-ups (sources listed) and move over time — treat as direction, not gospel.

## The high-traffic players

| App | Scale / why it matters | Price (approx.) | Their core strength |
|---|---|---|---|
| **Duolingo** | ~47–50M daily users, 113M+ monthly (StriveCloud, Digia, Investopedia via case studies) | Free + Super ~£10/mo | Habit loop: streaks, leagues, XP, reminders |
| **Khan Academy + Khanmigo** | Huge free library; AI tutor add-on | Free; Khanmigo ~£3/mo | Free adaptive mastery + AI tutoring |
| **Photomath** | Top "scan a maths problem" app | Free; Plus ~£8/mo | Camera → step-by-step solution |
| **BBC Bitesize** | "Gold standard" free UK-curriculum content (MathCraft) | Free | UK curriculum alignment + videos |
| **DoodleMaths/English** | Popular UK KS1–KS2 daily practice | ~£8/mo | Adaptive practice + parent dashboard |
| **Times Tables Rock Stars** | Used across UK schools | School/sub | One thing brilliantly (times tables) + competition |
| **Atom Learning** | 11-plus / KS2, 70,000+ questions | Subscription | Personalised pace, big question bank |
| **Seneca** | Popular GCSE/A-level revision | Free + premium | Fast interactive revision |
| **Third Space Learning** | KS2 maths with AI tutor "Skye" | Paid programmes | AI + human tutoring blend |

## Head-to-head: what Education Academy already matches

| Feature | Education Academy | Duolingo | Khan/Khanmigo | Photomath | DoodleMaths | BBC Bitesize |
|---|---|---|---|---|---|---|
| AI tutor **chat** (Socratic) | ✅ Ask Mochi | ⚠️ limited | ✅ Khanmigo (paid) | ❌ | ❌ | ❌ |
| Scan a question → help | ✅ Scan & solve | ❌ | ❌ | ✅ | ❌ | ❌ |
| Auto-targets weak topics | ✅ Smart Practice | ⚠️ | ✅ | ❌ | ✅ | ❌ |
| Daily streak | ✅ | ✅ (their superpower) | ⚠️ | ❌ | ✅ | ❌ |
| Daily goal + daily challenge | ✅ | ✅ | ⚠️ | ❌ | ✅ | ❌ |
| Badges / achievements | ✅ | ✅ | ⚠️ | ❌ | ✅ | ❌ |
| Reminders / notifications | ✅ (app) | ✅ | ⚠️ | ❌ | ✅ | ❌ |
| Leaderboard / competition | ❌ (next) | ✅ leagues | ❌ | ❌ | ⚠️ | ❌ |
| Languages (8) + RTL | ✅ | ✅ (universal design) | ⚠️ | ⚠️ | ❌ | ❌ |
| Local-currency pricing | ✅ | ✅ | ✅ | ✅ | ✅ | n/a |
| Exam-prep courses (incl. trades/IELTS/driving) | ✅ 11 courses | ❌ | ⚠️ | ❌ | ❌ | ⚠️ |
| Parent/teacher reports | ✅ + weekly email | ⚠️ | ⚠️ | ❌ | ✅ | ❌ |
| Mascot personality | ✅ Mochi | ✅ Duo | ❌ | ❌ | ⚠️ | ❌ |

**Takeaway:** the app already covers the winning mechanics most rivals are missing. The biggest *gap* vs the #1 player is **social competition (leagues/leaderboards)** and a true **referral loop** — both below.

## The success methods worth copying (and how)

### 1) Duolingo's habit loop is the whole game
Duolingo openly prioritises engagement: streaks, leagues, XP and notifications, with users reportedly ~3x more likely to return when a streak is active, and ~80% of new users arriving organically through share loops (Medium/Product Brief; Young Urban Project). Most of their growth came from the *product*, not ad spend.
- **You already have:** streaks, daily goal, daily challenge, badges, reminders. ✅
- **Easy wins to add:**
  - **Streak freeze / "don't lose your streak" reminder copy.** In `src/lib/reminders.js`, change the body to name the streak (e.g. "Keep your 6-day streak alive!"). 1-line change.
  - **A weekly leaderboard** (see special feature #1 idea below).

### 2) Loss aversion + identity ("I'm a streak person")
Breaking a streak feels like losing something earned (Digia, The PM Repo).
- **Easy win:** add a "streak freeze" item to the **Mochi shop** (buy with stars to protect one missed day). Reuses the shop you already have — add one item to `SHOP.extras` and skip the streak reset once when owned.

### 3) "Get to magic fast" onboarding
Duolingo gets users to a win in the first session.
- **You already have:** first-launch language picker + free Daily Challenge.
- **Easy win:** make the **first Daily Challenge auto-open** for brand-new users so they get an instant "I did it!" before hitting any paywall.

### 4) Photomath's camera hook
People search "scan maths problem" constantly.
- **You already have:** Scan & solve.
- **Easy win (ASO):** put "scan & solve", "homework help", "photo maths" in your **store title/keywords** (`STORE_LISTING.md`) — that's where Photomath gets discovered.

### 5) BBC Bitesize / Doodle = trust through curriculum alignment
UK parents pick apps that say "Year 3", "KS2", "SATs", "White Rose".
- **Easy win:** add explicit "Aligned to the UK National Curriculum / KS1–KS3" wording to the store listing and landing page (`marketing/index.html`). You already generate curriculum-aligned content — say so loudly.

### 6) Khanmigo proves parents will pay a little for an AI tutor
Khanmigo lands around £3/mo as an add-on.
- **You already have:** Ask Mochi (a *conversational* tutor — stronger than most). 
- **Easy win:** feature "AI tutor chat" front-and-centre in marketing; it's your clearest premium differentiator.

## Two ready-to-build "edge" features (high impact, low lift)

These reuse systems you already have:

1. **Family / class leaderboard (weekly XP).** Friendly competition is Duolingo's biggest retention lever you don't yet have. Build: store each learner's weekly stars on the server (you already have accounts + `stars`), add a `/api/leaderboard` endpoint and a "This week" board on the home screen scoped to a family/class code (you already have class codes in the parent/teacher area). ~Half a day.

2. **Referral reward loop.** ~80% of Duolingo's users come organically. Build on your existing Share/Invite: generate a per-user invite code, and when a friend signs up with it, grant both **bonus stars** (server marks it on the account). Turns sharing into growth. ~Half a day + a small server endpoint.

## Quick ASO / launch checklist (borrowed from what works)
- [ ] Store title includes a searched phrase: e.g. "Education Academy: KS1–KS3 AI Tutor & Homework Help".
- [ ] Keywords: scan & solve, homework help, times tables, SATs, KS2 maths, AI tutor.
- [ ] First screenshot shows the **AI tutor chat** + a **streak** (your differentiators).
- [ ] Say "UK National Curriculum aligned" and "free daily challenge" on the listing.
- [ ] Ask happy users to rate after a good session (already built via the in-app review prompt).

### Sources
Duolingo scale/mechanics: strivecloud.io, medium.com/@productbrief, youngurbanproject.com, digia.tech, uladshauchenka.com. UK app landscape/pricing: math-craft.app, gostudent.org, atomlearning.com, educationalappstore.com, thirdspacelearning.com. Always re-check current prices and figures before quoting them publicly.
