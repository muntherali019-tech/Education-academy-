import { useState } from "react";
import { ArrowLeft, Gift as GiftIcon, Loader2, Copy, Check } from "lucide-react";
import { PLANS } from "../data/curriculum.js";
import * as billing from "../lib/billing.js";
import { useT, tf } from "../lib/i18n.js";

// Gift a month of Education Academy. Mock mode mints a code instantly; the web
// build sends the buyer to a one-time Stripe Checkout (webhook mints the code).
export default function Gift({ onClose }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(null);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);

  async function buy(plan) {
    setBusy(true); setErr(null); setCode(null);
    try {
      const r = await billing.giftCheckout(plan);
      if (r?.redirect) return;              // leaving for Stripe's hosted page
      if (r?.code) setCode(r.code);
    } catch (e) { setErr(e.message || t("Couldn't create the gift.")); }
    finally { setBusy(false); }
  }
  function copyCode() { try { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }

  return (
    <main>
      <button className="iconbtn" onClick={onClose} aria-label={t("Back")} style={{ marginTop: 8 }}><ArrowLeft size={20} /></button>
      <div className="greet" style={{ marginTop: 4 }}><GiftIcon size={38} color="#F26B2A" /><h2 className="fred" style={{ marginTop: 6 }}>🎁 {t("Gift a subscription")}</h2><p>{t("Give a month of Mochi to a friend or family")}</p></div>

      {!code && (
        <div className="premrow">
          {["junior", "adult", "family"].map((plan) => (
            <button key={plan} className="premcard" onClick={() => buy(plan)} disabled={busy}>
              <div className="pemoji">{plan === "junior" ? "🐣" : plan === "adult" ? "🎓" : "👪"}</div>
              <div style={{ flex: 1 }}>
                <div className="ptitle">{tf("Gift {name}", { name: PLANS[plan].name })}</div>
                <div className="psub">{PLANS[plan].covers} · {PLANS[plan].price}</div>
              </div>
              {busy ? <Loader2 className="wiggle" size={18} /> : <span style={{ fontWeight: 800, color: "var(--muted)" }}>→</span>}
            </button>
          ))}
        </div>
      )}

      {err && <p className="err">{err}</p>}

      {code && (
        <div className="card" style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{ fontSize: 34 }}>🎉</div>
          <div className="fred" style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>{t("Your gift code")}</div>
          <button className="giftcode" onClick={copyCode} title={t("Copy")}>
            {code} {copied ? <Check size={16} /> : <Copy size={15} />}
          </button>
          <p className="note">{t("Send this code to whoever you're gifting. They redeem it in Settings.")}</p>
        </div>
      )}
    </main>
  );
}
