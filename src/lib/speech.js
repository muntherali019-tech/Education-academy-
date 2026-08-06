// Mochi's voice — two backends behind one interface:
//   - "device" (default): the browser's built-in Web Speech (free, offline).
//   - "cloud": a premium voice via the backend /api/tts proxy (ElevenLabs),
//     with automatic fallback to device speech if it fails or you're offline.
// Switch with VITE_TTS=cloud at build time. Everything else stays the same.

const TTS_MODE = import.meta.env.VITE_TTS || "device";
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const listeners = new Set();
let speaking = false;
function setSpeaking(v) { if (v === speaking) return; speaking = v; listeners.forEach((fn) => { try { fn(v); } catch {} }); }
export function onSpeakingChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function isSpeaking() { return speaking; }
export function mode() { return TTS_MODE; }

const hasWebSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
export function supported() { return hasWebSpeech() || TTS_MODE === "cloud"; }

// ---- persisted settings ----
const VKEY = "whisker.voice", NKEY = "whisker.narrate", LKEY = "whisker.voicelang", GKEY = "whisker.guide";
export function getVoiceOn() { try { const v = localStorage.getItem(VKEY); return v === null ? true : v === "1"; } catch { return true; } }
export function setVoiceOn(on) { try { localStorage.setItem(VKEY, on ? "1" : "0"); } catch {} if (!on) stop(); }
export function getNarrateOn() { try { return localStorage.getItem(NKEY) === "1"; } catch { return false; } }
export function setNarrateOn(on) { try { localStorage.setItem(NKEY, on ? "1" : "0"); } catch {} }
// Mochi's spoken language (BCP-47). Starts as English.
export function getLang() { try { return localStorage.getItem(LKEY) || "en-US"; } catch { return "en-US"; } }
export function setLang(code) { try { localStorage.setItem(LKEY, code || "en-US"); } catch {} }
// Guide mode: Mochi welcomes and gives spoken tips. On by default.
export function getGuideOn() { try { const v = localStorage.getItem(GKEY); return v === null ? true : v === "1"; } catch { return true; } }
export function setGuideOn(on) { try { localStorage.setItem(GKEY, on ? "1" : "0"); } catch {} }

// ---- device (Web Speech) ----
let voicesCache = [];
function loadVoices() { if (!hasWebSpeech()) return []; try { voicesCache = window.speechSynthesis.getVoices() || []; } catch { voicesCache = []; } return voicesCache; }
if (hasWebSpeech()) { try { loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; } catch {} }
function pickVoice(lang) {
  const all = voicesCache.length ? voicesCache : loadVoices();
  if (!all.length) return null;
  const code = (lang || "en-US").toLowerCase();
  const base = code.split("-")[0];
  const exact = all.find((v) => v.lang && v.lang.toLowerCase() === code);
  const list = all.filter((v) => v.lang && v.lang.toLowerCase().split("-")[0] === base);
  const friendly = list.find((v) => /female|girl|samantha|victoria|karen|tessa|zira|child|google/i.test(v.name)) || list[0];
  return exact || friendly || null;
}
function speakDevice(text, opts = {}) {
  if (!hasWebSpeech()) { opts.onend && opts.onend(); return; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = opts.lang || "en-US";
    const v = pickVoice(u.lang); if (v) u.voice = v;
    u.pitch = opts.pitch ?? 1.35; u.rate = opts.rate ?? 0.98; u.volume = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); opts.onend && opts.onend(); };
    u.onerror = () => { setSpeaking(false); };
    window.speechSynthesis.speak(u);
  } catch { setSpeaking(false); }
}

// ---- cloud (premium) ----
let currentAudio = null;
function stopAudio() { if (currentAudio) { try { currentAudio.pause(); currentAudio.currentTime = 0; } catch {} currentAudio = null; } }
async function speakCloud(text, opts = {}) {
  try {
    stopAudio();
    const res = await fetch(`${API_BASE}/tts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: String(text), lang: opts.lang || "en-US" }) });
    if (!res.ok) throw new Error("tts http " + res.status);
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url); currentAudio = audio;
    audio.onplay = () => setSpeaking(true);
    audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); currentAudio = null; opts.onend && opts.onend(); };
    audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); currentAudio = null; speakDevice(text, opts); };
    await audio.play();
  } catch { speakDevice(text, opts); } // graceful fallback to on-device voice
}

// ---- public ----
export function speak(text, opts = {}) {
  if (!text) return;
  if (opts.respectSetting !== false && !getVoiceOn()) return;
  const o = { ...opts, lang: opts.lang || getLang() };
  if (TTS_MODE === "cloud") speakCloud(text, o);
  else speakDevice(text, o);
}
export function stop() { try { if (hasWebSpeech()) window.speechSynthesis.cancel(); } catch {} stopAudio(); setSpeaking(false); }
