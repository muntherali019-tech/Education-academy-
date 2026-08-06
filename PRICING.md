# Pricing & per-country overrides

Base prices: **Junior £3/month** (KS1 & KS2), **Adult £5/month** (KS3, Higher Education & advanced courses). A 72-hour free trial precedes billing.

**Annual plans (best value, ~17% off — 12 months for the price of 10):** Junior **£30/year** (£2.50/mo equivalent), Adult **£50/year** (£4.17/mo equivalent). The plans and paywall screens default to the annual cycle with a monthly/annual toggle; learners can switch either way.

To enable annual on each store:
- **Stripe (web):** create a recurring **yearly** Price on each Product and set `STRIPE_PRICE_JUNIOR_YEARLY` / `STRIPE_PRICE_ADULT_YEARLY` on the server. If unset, annual checkout falls back to the monthly price.
- **Google Play (app):** add a **yearly** base plan to each subscription with product IDs `whisker_junior_yearly` and `whisker_adult_yearly` (alongside the existing monthly `whisker_junior_monthly` / `whisker_adult_monthly`).

Both stores can **charge each user in their local currency**. You can let the store auto-convert from your base price, or set explicit per-country prices (recommended for clean, "charm" pricing like 4.99 instead of an odd converted figure).

## Google Play (the mobile app build)
1. Play Console → your app → **Monetize → Products → Subscriptions**.
2. Create two base plans with the product IDs the app expects:
   - `whisker_junior_monthly`
   - `whisker_adult_monthly`
3. Set the base price in GBP. Play auto-generates local prices for every market.
4. To override per country: open the subscription → **Set prices** → edit individual countries.

Suggested local anchors (set these explicitly, then let Play handle the rest):

| Market | Currency | Junior | Adult |
|---|---|---|---|
| UK | GBP | £2.99 | £4.99 |
| Eurozone | EUR | €3.49 | €5.99 |
| USA | USD | $3.99 | $6.99 |
| India | INR | ₹199 | ₹399 |
| Brazil | BRL | R$14.90 | R$24.90 |
| Mexico | MXN | $59 | $99 |
| Japan | JPY | ¥500 | ¥900 |
| Australia | AUD | $5.99 | $9.99 |

The app shows Play's localized price string automatically — no code change needed.

## Stripe (the web build)
Stripe Checkout charges in the customer's currency when the Price supports it.
1. Create two **Products** with recurring monthly **Prices**.
2. For multi-currency: on each Price, add **currency options** (Stripe Dashboard → Product → Price → *Add another currency*), mirroring the table above. Checkout then presents the buyer's local currency automatically.
3. Put the resulting price IDs in the server env:
   - `STRIPE_PRICE_JUNIOR=price_xxx`
   - `STRIPE_PRICE_ADULT=price_yyy`

## VAT / tax
Both platforms can handle consumption tax: Google Play remits VAT/GST in most regions for you; for Stripe enable **Stripe Tax** so EU/UK VAT and other taxes are added and recorded. Keep prices tax-inclusive where the market expects it (EU/UK).
