# Education Academy — Google Play listing pack

Generated assets (in `resources/`): `icon.png` (1024², for `npx @capacitor/assets generate`), `icon-foreground.png` + `icon-background.png` (Android adaptive icon), `splash.png` (2732²), `feature-graphic-1024x500.png`. PWA icons are in `public/`.

## Title & short description
- **App name (≤30):** Education Academy
- **Short description (≤80):** Playful AI learning for UK key stages, with a friendly cat tutor.

## Full description (≤4000 chars)
Education Academy makes learning a delight. Your child learns with Mochi, a friendly cat tutor who welcomes them, cheers them on, and reads questions aloud — by default, and switchable off any time.

• Key stages KS1–KS3 and Higher Education, across maths, English and science
• AI-generated practice that adapts to the topic, with instant explanations
• Scan & solve: photograph a question for step-by-step working
• Mark my homework: snap a photo for warm, helpful feedback
• A built-in calculator for the maths section
• 8 languages — Mochi can teach in, and speak, English, Spanish, French, Mandarin, Russian, Arabic, Portuguese and Hindi; quizzes and feedback follow the chosen language
• Voice commands — just push the mic and say “give me 10 KS2 fractions questions” or “open the calculator”
• Grown-ups area — progress, goals and a weekly email summary for parents and teachers
• Advanced courses — exam-prep revision for Gas, Electrical and Renewable engineering and Business management

Start with a 72-hour free trial. Then Junior £3/month (KS1 & KS2) or Adult £5/month (KS3, Higher Education & courses). Cancel any time.

Made for families: a grown-up check sits before purchases, the camera and microphone, and account links. No third-party ads.

Please note: the advanced courses are revision and exam-preparation aids aligned to the relevant subject areas — they are not accredited courses and do not by themselves grant Gas Safe/ACS, City & Guilds, NVQ, MCS, CMI/ILM or any other qualification. AI features need an internet connection.

## Categorisation
- **Category:** Education
- **Tags:** education, kids, learning, tutoring
- **Content rating:** complete the IARC questionnaire → expected **Everyone / PEGI 3** (educational, no objectionable content). Declare AI-generated content and user-generated photos (homework).
- **Target audience:** include under-13 → Play **Designed for Families / Teacher Approved** track applies; follow the Families policy (which you already build toward: grown-up gates, no third-party ads, no PII to third parties).

## Data safety form (answers to prepare)
- **Account:** email + name (for sign-in and the weekly summary). Linked to the user; used for app functionality.
- **Photos:** homework/question images are sent to the AI provider to generate feedback; state whether stored (the app does not persist them server-side beyond the request).
- **Microphone:** used on-device for voice commands/recognition; transcript text is sent to the AI to interpret the command.
- **Encryption in transit:** yes. **Deletion:** account/data deletion is available in-app (anonymises order/records per HMRC/Play retention).
- List the AI subprocessor(s) you use and link your privacy policy.

## Required graphics checklist
- [ ] App icon 512×512 (use `resources/icon.png` → exported 512, or `public/icon-512.png`)
- [ ] Adaptive icon (foreground+background) — run `npx @capacitor/assets generate` with `resources/`
- [ ] Feature graphic 1024×500 (`resources/feature-graphic-1024x500.png`)
- [ ] Phone screenshots ×2–8 (1080×1920 portrait). Suggested set: Home with Mochi · A quiz with feedback · Scan & solve result · Languages lesson · Advanced course mock-exam result · Grown-ups progress
- [ ] (Optional) 7" & 10" tablet screenshots
- [ ] Short promo video (optional)

## What's new (release notes template)
First release: AI-tutored practice for KS1–HE, scan & solve, homework marking, calculator, 8-language support with localized quizzes, voice commands, advanced exam-prep courses, parent/teacher progress and weekly emails, and a 72-hour free trial.

## Pre-submission reminders
- Add PNG icons above (done) and generate Android densities via `@capacitor/assets`.
- Have a native speaker proof the cached UI translations (editable JSON on device).
- Confirm the package name `com.educationacademy.app` is the one you want — it is permanent once published.
- Keep the “revision aid, not certification” wording on the courses.

## Pricing & local currency
Set the subscription base price in the Play Console; Google Play automatically shows and **charges each user in their local currency** (you can also set per-country prices). The app reads Play's localized price string via RevenueCat and displays it on the paywall/plans — so users worldwide see the correct currency once real billing is configured (`VITE_BILLING=revenuecat`). In demo mode the UI shows the GBP defaults. The web build is demo-only; a web storefront would need its own processor (e.g. Stripe), which also localizes currency.
