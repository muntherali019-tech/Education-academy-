// Printable, self-contained certificate and worksheet output. We render the
// document into a hidden iframe and call print() on it, so the app's own layout
// is never disturbed and the result is a clean, single-page print/PDF.

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const today = () => new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

function openPrint(inner, title = "Education Academy") {
  const html =
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      *{box-sizing:border-box} body{margin:0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#3A2A22;padding:28px}
      .cert{background:linear-gradient(135deg,#FFFDF6,#FFF3DC);border:8px double #FF8A47;border-radius:16px;padding:40px 32px;text-align:center;max-width:720px;margin:0 auto}
      .cert .seal{font-size:60px} .cert h1{font-family:Georgia,serif;font-size:30px;margin:8px 0 0} .cert .sub{color:#8a766c;font-weight:700;margin-top:4px}
      .cert .who{font-size:30px;color:#6b4fb0;margin:22px 0 4px;font-weight:800} .cert .for{color:#8a766c}
      .cert .stats{display:flex;justify-content:center;gap:34px;flex-wrap:wrap;margin:22px 0 6px;font-weight:700}
      .cert .stats b{display:block;font-size:26px;color:#F26B2A} .cert .sig{margin-top:26px;color:#8a766c;font-weight:700;font-size:13px}
      .ws{max-width:720px;margin:0 auto} .ws header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #FF8A47;padding-bottom:8px}
      .ws h1{font-size:24px;margin:0} .ws .meta{color:#8a766c;font-weight:700;font-size:13px} .ws .instr{color:#5a463c;margin:12px 0}
      .ws ol{padding-left:22px} .ws li{margin:16px 0;font-weight:600} .ws .rule{border-bottom:1px dashed #cbb89f;height:22px;margin-top:8px}
      .ws .key{margin-top:28px;border-top:2px solid #eadfce;padding-top:10px;color:#8a766c;font-size:13px}
      .ws .key b{color:#3A2A22} .brand{text-align:center;color:#b09a86;font-size:12px;margin-top:24px}
      @media print{@page{margin:14mm}}
    </style></head><body>${inner}<div class="brand">🐱 Education Academy · educationacademy.app</div></body></html>`;
  const f = document.createElement("iframe");
  f.setAttribute("aria-hidden", "true");
  Object.assign(f.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" });
  document.body.appendChild(f);
  const doc = f.contentDocument || f.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  const cleanup = () => setTimeout(() => { try { f.remove(); } catch {} }, 800);
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch {} cleanup(); }, 300);
}

// Certificate of achievement for a learner.
export function printCertificate({ name = "Your learner", stage = "", stars = 0, accuracy = 0, answered = 0, rounds = 0 } = {}) {
  const inner =
    `<div class="cert"><div class="seal">🏆</div>
      <h1>Certificate of Achievement</h1><div class="sub">Awarded by Mochi at Education Academy</div>
      <div class="for">This certifies that</div><div class="who">${esc(name)}</div>
      <div class="for">has shown wonderful effort and progress${stage ? " in " + esc(stage) : ""}.</div>
      <div class="stats"><span><b>${esc(stars)}</b>stars</span><span><b>${esc(accuracy)}%</b>accuracy</span><span><b>${esc(answered)}</b>answered</span><span><b>${esc(rounds)}</b>rounds</span></div>
      <div class="sig">Awarded ${esc(today())} · Keep up the brilliant work! 🐾</div>
    </div>`;
  openPrint(inner, `Certificate — ${name}`);
}

// Printable worksheet with an answer key.
export function printWorksheet({ title = "Practice worksheet", instructions = "", questions = [] } = {}) {
  const items = questions.map((q) => `<li>${esc(q.q)}<div class="rule"></div></li>`).join("");
  const key = questions.map((q, i) => `${i + 1}. <b>${esc(q.answer)}</b>`).join(" &nbsp; ");
  const inner =
    `<div class="ws"><header><h1>${esc(title)}</h1><span class="meta">Name: ____________  Date: __________</span></header>
      ${instructions ? `<p class="instr">${esc(instructions)}</p>` : ""}
      <ol>${items}</ol>
      <div class="key"><b>Answer key</b> (for grown-ups): ${key}</div>
    </div>`;
  openPrint(inner, title);
}
