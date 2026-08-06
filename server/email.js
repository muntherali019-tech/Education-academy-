// Minimal, provider-agnostic email sender (no extra dependencies — uses fetch).
// Choose a provider with EMAIL_PROVIDER: "console" (default, logs only),
// "resend", or "sendgrid". Add the matching API key to .env.
const PROVIDER = process.env.EMAIL_PROVIDER || "console";
const FROM = process.env.EMAIL_FROM || "Education Academy <noreply@example.com>";

export async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error("No recipient.");

  if (PROVIDER === "console") {
    console.log(`\n[email:console]\n  To: ${to}\n  Subject: ${subject}\n  ${String(text).replace(/\n/g, "\n  ")}\n`);
    return { ok: true, provider: "console" };
  }

  if (PROVIDER === "resend") {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, text, ...(html ? { html } : {}) }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return { ok: true, provider: "resend" };
  }

  if (PROVIDER === "sendgrid") {
    const fromEmail = (FROM.match(/<(.+)>/) || [, FROM])[1];
    const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail },
        subject,
        content: [{ type: "text/plain", value: text }, ...(html ? [{ type: "text/html", value: html }] : [])],
      }),
    });
    if (!r.ok) throw new Error(`sendgrid ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return { ok: true, provider: "sendgrid" };
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${PROVIDER}`);
}
