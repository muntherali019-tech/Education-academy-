import { useState } from "react";
import { ArrowLeft, Loader2, Printer, RefreshCw } from "lucide-react";
import { KS_LABEL, KS_META, SUBJ, SUBJECTS_BY_KS, TOPICS } from "../data/curriculum.js";
import { generateWorksheet } from "../lib/api.js";
import { printWorksheet } from "../lib/printable.js";
import { useT } from "../lib/i18n.js";

// Printable practice-worksheet generator (a premium, revenue-supporting tool).
// Optional `preset` { ks, subject, topic } deep-links from a "needs practice" row.
export default function Worksheet({ onClose, preset = null, language = "English" }) {
  const t = useT();
  const [ks, setKs] = useState(preset?.ks || "ks2");
  const [subject, setSubject] = useState(preset?.subject || "maths");
  const [topic, setTopic] = useState(preset?.topic || (TOPICS.ks2.maths[0][0]));
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [err, setErr] = useState(null);

  const subjects = SUBJECTS_BY_KS[ks] || ["maths"];
  const topics = (TOPICS[ks]?.[subject] || []).map(([name]) => name);
  const pickKs = (v) => { setKs(v); const sub = (SUBJECTS_BY_KS[v] || ["maths"])[0]; setSubject(sub); setTopic((TOPICS[v]?.[sub] || [["", ""]])[0][0]); setSheet(null); };
  const pickSubject = (v) => { setSubject(v); setTopic((TOPICS[ks]?.[v] || [["", ""]])[0][0]); setSheet(null); };

  async function make() {
    setBusy(true); setErr(null); setSheet(null);
    try {
      const w = await generateWorksheet({ ks, subject, topic, count, language });
      if (!w.questions.length) throw new Error("empty");
      setSheet(w);
    } catch { setErr(t("Couldn't make the worksheet just now — please try again.")); }
    finally { setBusy(false); }
  }

  return (
    <main>
      <button className="iconbtn" onClick={onClose} aria-label={t("Back")} style={{ marginTop: 8 }}><ArrowLeft size={20} /></button>
      <div className="greet" style={{ marginTop: 4 }}><div style={{ fontSize: 40 }}>📝</div><h2 className="fred" style={{ marginTop: 6 }}>{t("Practice worksheet")}</h2><p>{t("Make a printable worksheet")}</p></div>

      <div className="card">
        <label className="wsl">{t("Stage")}
          <select value={ks} onChange={(e) => pickKs(e.target.value)} className="wsel">{KS_META.map((m) => <option key={m.id} value={m.id}>{KS_LABEL[m.id]}</option>)}</select>
        </label>
        <label className="wsl">{t("Subject")}
          <select value={subject} onChange={(e) => pickSubject(e.target.value)} className="wsel">{subjects.map((s) => <option key={s} value={s}>{SUBJ[s].name}</option>)}</select>
        </label>
        <label className="wsl">{t("Topic")}
          <select value={topic} onChange={(e) => { setTopic(e.target.value); setSheet(null); }} className="wsel">{topics.map((tp) => <option key={tp} value={tp}>{tp}</option>)}</select>
        </label>
        <label className="wsl">{t("Questions")}
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="wsel">{[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <button className="bigbtn mint" onClick={make} disabled={busy} style={{ marginTop: 12 }}>
          {busy ? <><Loader2 className="wiggle" size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />{t("Creating your worksheet…")}</> : <>✨ {t("Create worksheet")}</>}
        </button>
      </div>

      {err && <p className="err">{err}</p>}

      {sheet && (
        <div className="ws printable" style={{ marginTop: 14 }}>
          <h3 className="fred">{sheet.title}</h3>
          {sheet.instructions && <p className="muted" style={{ marginTop: 2 }}>{sheet.instructions}</p>}
          <ol>{sheet.questions.map((q, i) => <li key={i}>{q.q}</li>)}</ol>
          <div className="ans">{t("Answers")}: {sheet.questions.map((q, i) => `${i + 1}. ${q.answer}`).join("   ·   ")}</div>
        </div>
      )}
      {sheet && (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <button className="bigbtn purple" onClick={() => printWorksheet(sheet)}><Printer size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />{t("Download worksheet")}</button>
          <button className="bigbtn ghost" onClick={make} disabled={busy}><RefreshCw size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />{t("Make another")}</button>
        </div>
      )}
    </main>
  );
}
