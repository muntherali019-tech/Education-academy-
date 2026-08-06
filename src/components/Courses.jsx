import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Sparkles, Check, X, RefreshCw, GraduationCap, Volume2, AlertTriangle, Timer, Download, WifiOff } from "lucide-react";
import Mochi from "./Mochi.jsx";
import { COURSES, COURSE_DISCLAIMER } from "../data/courses.js";
import { courseLesson, examQuestions } from "../lib/api.js";
import { isOnline, cachedCount, addToCache, sampleCached } from "../lib/examCache.js";
import { LANGUAGES } from "../data/languages.js";
import { useT } from "../lib/i18n.js";
import * as speech from "../lib/speech.js";
import { cheer } from "../lib/coach.js";

const PASS = 0.8;                        // indicative pass mark (80%)
const EXAM_COUNTS = [20, 30, 40];
const SECONDS_PER_Q = 60;
const say = (text) => speech.speak(text, { pitch: 1.05 });
const langName = () => (LANGUAGES.find((l) => l.code === speech.getLang()) || {}).name || "English";
const bankKey = (c) => `${c.id}:${speech.getLang().split("-")[0]}`; // offline cache is per language
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Bubble({ text }) {
  if (!text) return null;
  return <div className="bubble" role="status" aria-live="polite">{text}</div>;
}

export default function Courses({ onClose, onResult }) {
  const t = useT();
  const [view, setView] = useState("pick");   // pick | modules | lesson | examStart | exam
  const [course, setCourse] = useState(null);
  const [module, setModule] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [bubble, setBubble] = useState("");

  // module quiz
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [announce, setAnnounce] = useState("");

  // mock exam
  const [examCount, setExamCount] = useState(20);
  const [examQs, setExamQs] = useState([]);
  const [examAnswers, setExamAnswers] = useState([]);
  const [exi, setExi] = useState(0);
  const [examLoading, setExamLoading] = useState(false);
  const [examErr, setExamErr] = useState("");
  const [examDone, setExamDone] = useState(false);
  const [examScore, setExamScore] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => speech.onSpeakingChange(setSpeaking), []);
  useEffect(() => () => speech.stop(), []);

  // exam countdown
  useEffect(() => {
    if (view !== "exam" || examDone || !examQs.length) return;
    if (secondsLeft <= 0) { submitExam(); return; }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [view, examDone, examQs.length, secondsLeft]);

  async function loadLesson(c, m) {
    setLoading(true); setErr(""); setLesson(null); setBubble("");
    setQi(0); setPicked(null); setCorrect(0); setAnnounce("");
    try {
      const data = await courseLesson({ course: c.title, module: m, language: langName() });
      if (!Array.isArray(data?.keypoints) || !Array.isArray(data?.quiz) || !data.quiz.length) throw new Error("thin");
      setLesson(data); setBubble(data.intro || `Let's revise ${m}.`);
      addToCache(bankKey(c), data.quiz); setOfflineCount(cachedCount(bankKey(c)));
      say(data.intro || `Let's revise ${m}. You've got this.`);
    } catch { setErr("Mochi couldn't build this lesson — these courses need an internet connection. Please try again."); }
    finally { setLoading(false); }
  }

  function openCourse(c) {
    setCourse(c); setView("modules"); setOfflineCount(cachedCount(bankKey(c)));
    // Download questions for offline use as soon as connectivity allows.
    if (isOnline() && cachedCount(bankKey(c)) < 20) {
      examQuestions({ course: c.title, modules: c.modules, count: 10, language: langName() })
        .then((qs) => { addToCache(bankKey(c), qs); setOfflineCount(cachedCount(bankKey(c))); })
        .catch(() => {});
    }
  }
  function openModule(m) { setModule(m); setView("lesson"); loadLesson(course, m); }

  function answer(i) {
    if (picked !== null) return;
    setPicked(i);
    const q = lesson.quiz[qi];
    const right = i === Number(q.answerIndex);
    if (right) setCorrect((c) => c + 1);
    setAnnounce(right ? "Correct." : `Not quite. ${q.why || ""}`);
    setBubble(right ? cheer("adult") : "Review this one and keep going.");
    say(right ? cheer("adult") : `Not quite. ${q.why || ""}`);
  }
  function next() {
    if (qi + 1 < lesson.quiz.length) { setQi(qi + 1); setPicked(null); setAnnounce(""); setBubble(""); }
    else {
      const score = Math.round((correct / lesson.quiz.length) * 100);
      const m = `Module complete — ${correct} out of ${lesson.quiz.length}.`;
      setQi(lesson.quiz.length); setAnnounce(m); setBubble(m); say(m + " Well done.");
      onResult && onResult({ course: course.title, module, type: "module", count: lesson.quiz.length, correct, score, passed: null });
    }
  }

  async function buildExam(count) {
    setView("exam"); setExamLoading(true); setExamErr(""); setExamQs([]); setExamDone(false); setExamScore(null); setExi(0); setBubble("");
    try {
      let final = [];
      if (!isOnline()) {
        final = sampleCached(bankKey(course), count);
        if (final.length < Math.min(5, count)) throw new Error("offline-empty");
      } else {
        const seen = new Set(); const all = [];
        const maxCalls = Math.ceil(count / 10) + 2;
        for (let c = 0; c < maxCalls && all.length < count; c++) {
          const qs = await examQuestions({ course: course.title, modules: course.modules, count: Math.min(10, count - all.length), language: langName() });
          addToCache(bankKey(course), qs);
          for (const q of qs) {
            const k = String(q.q || "").trim().toLowerCase();
            if (q.q && Array.isArray(q.options) && q.options.length >= 2 && !seen.has(k)) { seen.add(k); all.push(q); }
            if (all.length >= count) break;
          }
          if (!qs.length) break;
        }
        if (all.length < count) { // top up from the offline bank if AI returned fewer
          for (const q of sampleCached(bankKey(course), count)) { const k = String(q.q || "").trim().toLowerCase(); if (!seen.has(k)) { seen.add(k); all.push(q); } if (all.length >= count) break; }
        }
        setOfflineCount(cachedCount(bankKey(course)));
        final = all.slice(0, count);
        if (final.length < Math.min(5, count)) throw new Error("thin");
      }
      setExamQs(final); setExamAnswers(new Array(final.length).fill(null)); setSecondsLeft(final.length * SECONDS_PER_Q);
      say(`Your mock exam has ${final.length} questions. Good luck!`);
    } catch {
      setExamErr(isOnline() ? "Couldn't build the exam — please try again." : "No offline questions saved yet — connect to the internet once and tap \u201CSave for offline\u201D.");
    } finally { setExamLoading(false); }
  }

  async function saveOffline() {
    if (!isOnline() || saving) return;
    setSaving(true);
    try { for (let i = 0; i < 3; i++) { const qs = await examQuestions({ course: course.title, modules: course.modules, count: 10, language: langName() }); addToCache(bankKey(course), qs); if (!qs.length) break; } setOfflineCount(cachedCount(bankKey(course))); }
    catch {} finally { setSaving(false); }
  }

  function downloadSummary() {
    const d = new Date();
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Practice result</title></head><body style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:24px auto;color:#333;">` +
      `<h1 style="color:#6b4fb0;">Education Academy — Practice Result</h1>` +
      `<p><b>Course:</b> ${course.title}<br><b>Mock exam:</b> ${examQs.length} questions<br><b>Score:</b> ${examScore.score}% (${examScore.correct}/${examQs.length})<br><b>Result:</b> ${examScore.passed ? "Pass (\u2265 80%)" : "Not yet (below 80%)"}<br><b>Date:</b> ${d.toLocaleString()}</p>` +
      `<p style="background:#fff3cd;border:1px solid #ffe69c;padding:12px;border-radius:8px;"><b>Important:</b> This is a practice/revision result only. It is <b>not</b> a certificate or accredited qualification and does not confer Gas Safe/ACS, City &amp; Guilds, NVQ, MCS, CMI/ILM or any other award.</p>` +
      `</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a"); a.href = url; a.download = `practice-result-${course.id}.html`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function pickExam(i) { setExamAnswers((a) => { const n = [...a]; n[exi] = i; return n; }); }
  function submitExam() {
    if (examDone || !examQs.length) return;
    const c = examQs.reduce((n, q, idx) => n + (examAnswers[idx] === Number(q.answerIndex) ? 1 : 0), 0);
    const score = Math.round((c / examQs.length) * 100);
    const passed = score >= PASS * 100;
    setExamScore({ correct: c, score, passed }); setExamDone(true);
    onResult && onResult({ course: course.title, module: null, type: "exam", count: examQs.length, correct: c, score, passed });
    say(passed ? `Congratulations — you passed with ${score} percent.` : `You scored ${score} percent. Keep revising and try again.`);
  }

  /* ---------- PICK A COURSE ---------- */
  if (view === "pick") {
    return (
      <main>
        <button className="iconbtn" onClick={onClose} aria-label="Back to home" style={{ marginTop: 8 }}><ArrowLeft size={20} /></button>
        <div className="greet" style={{ marginTop: 4 }}>
          <Mochi size={104} expression="read" speaking={speaking} />
          <h2 className="fred" style={{ marginTop: 6 }}>{t("Advanced courses 🎓")}</h2>
          <p>{t("Exam-prep & revision with your AI trainer")}</p>
        </div>
        <div className="pickgrid">
          {COURSES.map((c) => (
            <button key={c.id} className="pick" style={{ background: c.grad }} onClick={() => openCourse(c)} aria-label={`Open ${c.title}`}>
              <div className="em">{c.emoji}</div>
              <div style={{ flex: 1 }}><div className="tt">{c.title}</div><div className="ds">{c.align}</div></div>
            </button>
          ))}
        </div>
        <div className="card" style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <AlertTriangle size={18} color="#b3271e" style={{ flex: "none", marginTop: 2 }} />
          <p className="muted" style={{ margin: 0 }}>{COURSE_DISCLAIMER}</p>
        </div>
      </main>
    );
  }

  /* ---------- MODULES ---------- */
  if (view === "modules" && course) {
    return (
      <main>
        <button className="iconbtn" onClick={() => setView("pick")} aria-label="Back to courses" style={{ marginTop: 8 }}><ArrowLeft size={20} /></button>
        <div className="greet" style={{ marginTop: 4 }}>
          <Mochi size={88} expression="think" speaking={speaking} />
          <h2 className="fred" style={{ marginTop: 6 }}>{course.emoji} {course.title}</h2>
          <p><GraduationCap size={15} style={{ verticalAlign: "-2px" }} /> Revise a module, or sit a mock exam</p>
        </div>
        <button className="bigbtn purple" onClick={() => setView("examStart")}><Timer size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />Mock exam</button>
        <button className="bigbtn ghost" onClick={saveOffline} disabled={!isOnline() || saving}>
          {saving ? <Loader2 className="wiggle" size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} /> : <Download size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />}
          {!isOnline() ? "Offline — using saved questions" : saving ? "Saving…" : "Save questions for offline"}
        </button>
        <p className="muted" style={{ textAlign: "center", marginTop: 2 }}>{offlineCount > 0 ? `📥 ${offlineCount} questions saved for offline use` : "No offline questions saved yet"}</p>
        <div className="sectitle">Modules</div>
        <div className="card">
          {course.modules.map((m, i) => (
            <button key={i} className="rowbtn" onClick={() => openModule(m)} aria-label={`Revise ${m}`}>
              <span style={{ flex: 1 }}>{m}</span><Sparkles size={16} color="#6b4fb0" />
            </button>
          ))}
        </div>
        <p className="muted" style={{ textAlign: "center" }}>{course.align} Revision aid only — see the disclaimer on the courses page.</p>
      </main>
    );
  }

  /* ---------- EXAM START (choose length) ---------- */
  if (view === "examStart" && course) {
    return (
      <main>
        <button className="iconbtn" onClick={() => setView("modules")} aria-label="Back to modules" style={{ marginTop: 8 }}><ArrowLeft size={20} /></button>
        <div className="greet" style={{ marginTop: 4 }}>
          <Mochi size={92} expression="think" speaking={speaking} />
          <h2 className="fred" style={{ marginTop: 6 }}>Mock exam</h2>
          <p>{course.emoji} {course.title}</p>
        </div>
        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>How many questions?</div>
          <div style={{ display: "flex", gap: 10 }}>
            {EXAM_COUNTS.map((n) => (
              <button key={n} className={`seg ${examCount === n ? "on" : ""}`} style={{ flex: 1 }} aria-pressed={examCount === n} onClick={() => setExamCount(n)}>{n}</button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 10 }}>Timed: {examCount} minutes ({SECONDS_PER_Q}s per question). Pass mark {Math.round(PASS * 100)}%.</p>
          {offlineCount > 0 && <p className="muted" style={{ margin: "4px 0 0" }}><WifiOff size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />{offlineCount} questions available offline</p>}
        </div>
        <button className="bigbtn mint" onClick={() => buildExam(examCount)}><Timer size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />Start exam</button>
        <p className="muted" style={{ textAlign: "center" }}>Revision aid — not an accredited assessment.</p>
      </main>
    );
  }

  /* ---------- EXAM (in progress / results) ---------- */
  if (view === "exam" && course) {
    if (examLoading) return <main><div style={{ textAlign: "center", marginTop: 60 }}><Loader2 className="wiggle" size={28} color="#6b4fb0" /><p className="muted">Building your {examCount}-question mock exam…</p></div></main>;
    if (examErr) return <main><button className="iconbtn" onClick={() => setView("examStart")} aria-label="Back" style={{ marginTop: 8 }}><ArrowLeft size={20} /></button><div className="card"><p className="err" style={{ marginTop: 0 }}>{examErr}</p><button className="bigbtn purple" onClick={() => buildExam(examCount)}>Try again</button></div></main>;

    if (examDone && examScore) {
      const wrong = examQs.map((q, i) => ({ q, i })).filter(({ q, i }) => examAnswers[i] !== Number(q.answerIndex));
      return (
        <main>
          <div className="greet" style={{ marginTop: 16 }}>
            <Mochi size={120} expression={examScore.passed ? "happy" : "think"} speaking={speaking} />
            <span className={`pill`} style={{ marginTop: 8, background: examScore.passed ? "var(--good)" : "var(--coral)", color: "#fff" }}>{examScore.passed ? "PASS" : "Keep going"}</span>
            <h2 className="fred" style={{ marginTop: 10 }}>{examScore.score}% — {examScore.correct}/{examQs.length}</h2>
            <p>Pass mark {Math.round(PASS * 100)}%.</p>
          </div>
          {wrong.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Review ({wrong.length})</div>
              {wrong.map(({ q, i }) => (
                <div key={i} className="goalrow">
                  <div style={{ fontWeight: 800 }}>{q.q}</div>
                  <div className="muted" style={{ marginTop: 2 }}>Correct: {q.options[Number(q.answerIndex)]}</div>
                  {q.why && <div className="muted" style={{ marginTop: 2 }}><b>Why:</b> {q.why}</div>}
                </div>
              ))}
            </div>
          )}
          <button className="bigbtn ghost" onClick={downloadSummary}><Download size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />Download result (practice)</button>
          <button className="bigbtn purple" onClick={() => buildExam(examCount)}><RefreshCw size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />New exam</button>
          <button className="bigbtn ghost" onClick={() => setView("modules")}>Back to modules</button>
        </main>
      );
    }

    const q = examQs[exi];
    const chosen = examAnswers[exi];
    const last = exi + 1 >= examQs.length;
    return (
      <main>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <span className="pill" style={{ flex: "none" }}>Q {exi + 1}/{examQs.length}</span>
          <span className="pill" style={{ marginLeft: "auto", background: secondsLeft <= 60 ? "var(--coral)" : "var(--ink)", color: "#fff" }}><Timer size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />{mmss(secondsLeft)}</span>
        </div>
        <div className="card" style={{ marginTop: 10 }}><div style={{ fontWeight: 800, fontSize: 17 }}>{q.q}</div></div>
        <div className="langopts">
          {q.options.map((opt, i) => (
            <button key={i} className={`langopt${chosen === i ? " on" : ""}`} onClick={() => pickExam(i)} aria-label={`Option ${i + 1}: ${opt}`} aria-pressed={chosen === i}>
              <span style={{ flex: 1 }}>{opt}</span>{chosen === i && <Check size={18} />}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {exi > 0 && <button className="bigbtn ghost" style={{ flex: 1 }} onClick={() => setExi(exi - 1)}>Back</button>}
          {!last
            ? <button className="bigbtn mint" style={{ flex: 1 }} onClick={() => setExi(exi + 1)}>Next</button>
            : <button className="bigbtn purple" style={{ flex: 1 }} onClick={submitExam}>Submit exam</button>}
        </div>
        <button className="linkbtn" style={{ display: "block", margin: "12px auto 0" }} onClick={submitExam}>Finish &amp; submit now</button>
      </main>
    );
  }

  /* ---------- MODULE LESSON + QUIZ ---------- */
  if (view === "lesson" && course) {
    const done = lesson && qi >= lesson.quiz.length;
    const q = lesson && !done ? lesson.quiz[qi] : null;
    return (
      <main>
        <button className="iconbtn" onClick={() => setView("modules")} aria-label="Back to modules" style={{ marginTop: 8 }}><ArrowLeft size={20} /></button>
        <div className="greet" style={{ marginTop: 4 }}>
          <Mochi size={84} expression={picked === null ? "read" : picked === Number(q?.answerIndex) ? "happy" : "oops"} speaking={speaking} />
          <h3 className="fred" style={{ marginTop: 6 }}>{module}</h3>
        </div>
        <Bubble text={bubble} />
        <p aria-live="assertive" className="visually-hidden">{announce}</p>

        {loading && <div style={{ textAlign: "center", marginTop: 22 }}><Loader2 className="wiggle" size={26} color="#6b4fb0" /><p className="muted">Preparing your revision…</p></div>}
        {err && <div className="card"><p className="err" style={{ marginTop: 0 }}>{err}</p><button className="bigbtn purple" onClick={() => loadLesson(course, module)}>Try again</button></div>}

        {lesson && !loading && (
          <>
            <div className="card">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Key revision points</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{lesson.keypoints.map((k, i) => <li key={i} style={{ margin: "4px 0", fontWeight: 600 }}>{k}</li>)}</ul>
              <button className="spk" onClick={() => say(lesson.keypoints.join(". "))} aria-label="Read the key points aloud" style={{ marginTop: 10 }}><Volume2 size={20} /></button>
            </div>

            {!done ? (
              <>
                <p className="pill" style={{ display: "inline-block" }}>Practice question {qi + 1} of {lesson.quiz.length}</p>
                <div className="card"><div style={{ fontWeight: 800, fontSize: 17 }}>{q.q}</div></div>
                <div className="langopts">
                  {q.options.map((opt, i) => {
                    const state = picked === null ? "" : i === Number(q.answerIndex) ? " right" : i === picked ? " wrong" : "";
                    return (
                      <button key={i} className={`langopt${state}`} onClick={() => answer(i)} disabled={picked !== null} aria-label={`Option ${i + 1}: ${opt}`}>
                        <span style={{ flex: 1 }}>{opt}</span>
                        {picked !== null && i === Number(q.answerIndex) && <Check size={18} />}
                        {picked !== null && i === picked && i !== Number(q.answerIndex) && <X size={18} />}
                      </button>
                    );
                  })}
                </div>
                {picked !== null && q.why && <div className="card"><p className="muted" style={{ margin: 0 }}><b>Why:</b> {q.why}</p></div>}
                {picked !== null && <button className="bigbtn mint" onClick={next}>{qi + 1 < lesson.quiz.length ? "Next" : "See result"}</button>}
              </>
            ) : (
              <div className="greet" style={{ marginTop: 10 }}>
                <Mochi size={110} expression="happy" speaking={speaking} />
                <h2 className="fred" style={{ marginTop: 8 }}>{correct}/{lesson.quiz.length} correct</h2>
                <p>Solid revision on {module}.</p>
                <button className="bigbtn purple" onClick={() => loadLesson(course, module)}><RefreshCw size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />New questions</button>
                <button className="bigbtn ghost" onClick={() => setView("modules")}>Back to modules</button>
              </div>
            )}
          </>
        )}
      </main>
    );
  }

  return <main><button className="iconbtn" onClick={onClose} aria-label="Back"><ArrowLeft size={20} /></button></main>;
}
