// Speaking practice via the browser's SpeechRecognition API.
// Supported in Chrome/Edge and Android Chrome; not in Firefox or (reliably) iOS Safari,
// so callers should check supported() and offer a manual "I said it" fallback.

const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export function supported() { return !!SR; }

// Start listening once. Returns a stop() function.
// opts: { lang, onResult(alternatives[]), onError(err), onEnd() }
export function listen(opts = {}) {
  if (!SR) { opts.onError && opts.onError(new Error("unsupported")); return () => {}; }
  let rec;
  try {
    rec = new SR();
    rec.lang = opts.lang || "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 4;
    rec.continuous = false;
    rec.onresult = (e) => {
      const r = e.results && e.results[0];
      const alts = [];
      if (r) for (let i = 0; i < r.length; i++) alts.push(r[i].transcript);
      opts.onResult && opts.onResult(alts);
    };
    rec.onerror = (e) => { opts.onError && opts.onError(e); };
    rec.onend = () => { opts.onEnd && opts.onEnd(); };
    rec.start();
  } catch (err) { opts.onError && opts.onError(err); return () => {}; }
  return () => { try { rec.stop(); } catch {} };
}

// Lenient comparison so young learners get credit for a good attempt.
export function roughMatch(said, target) {
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]/gu, "");
  const a = norm(said), b = norm(target);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}
