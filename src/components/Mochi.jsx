// Mochi the ginger cat — the app's mascot. Pass an `expression` to change her face.
// Cosmetics (fur colour, hat, glasses) are read from the shop so every Mochi on
// screen reflects what the learner has equipped. Explicit props override the saved look.
import { COLOR_THEMES, getEquipped } from "../lib/mochiShop.js";

export default function Mochi({ expression = "idle", size = 120, speaking = false, color, hat, glasses }) {
  const eq = getEquipped();
  const theme = COLOR_THEMES[color || eq.color] || COLOR_THEMES.ginger;
  const HAT = hat || eq.hat || "none";
  const GLASSES = glasses != null ? glasses : eq.glasses;
  const { base, inner, muzzle, deep, whisker } = theme;

  const eyes = {
    idle:  <g><circle cx="46" cy="58" r="6" fill="#3A2A22"/><circle cx="78" cy="58" r="6" fill="#3A2A22"/><circle cx="48" cy="56" r="2" fill="#fff"/><circle cx="80" cy="56" r="2" fill="#fff"/></g>,
    happy: <g><path d="M40 58 q6 -8 12 0" stroke="#3A2A22" strokeWidth="4" fill="none" strokeLinecap="round"/><path d="M72 58 q6 -8 12 0" stroke="#3A2A22" strokeWidth="4" fill="none" strokeLinecap="round"/></g>,
    think: <g><circle cx="48" cy="54" r="5" fill="#3A2A22"/><circle cx="80" cy="54" r="5" fill="#3A2A22"/><path d="M70 44 q8 -3 14 1" stroke="#3A2A22" strokeWidth="3" fill="none" strokeLinecap="round"/></g>,
    oops:  <g><path d="M40 56 q6 6 12 0" stroke="#3A2A22" strokeWidth="4" fill="none" strokeLinecap="round"/><path d="M72 56 q6 6 12 0" stroke="#3A2A22" strokeWidth="4" fill="none" strokeLinecap="round"/></g>,
    read:  <g><circle cx="46" cy="58" r="6" fill="#3A2A22"/><circle cx="78" cy="58" r="6" fill="#3A2A22"/></g>,
  }[expression] || null;

  const mouth = {
    idle:  <path d="M56 70 q6 6 12 0" stroke="#3A2A22" strokeWidth="3" fill="none" strokeLinecap="round"/>,
    happy: <path d="M52 70 q10 12 20 0" stroke="#3A2A22" strokeWidth="3.5" fill="#FF8FA3" strokeLinecap="round"/>,
    think: <path d="M58 72 h8" stroke="#3A2A22" strokeWidth="3" strokeLinecap="round"/>,
    oops:  <path d="M56 74 q6 -5 12 0" stroke="#3A2A22" strokeWidth="3" fill="none" strokeLinecap="round"/>,
    read:  <path d="M56 70 q6 5 12 0" stroke="#3A2A22" strokeWidth="3" fill="none" strokeLinecap="round"/>,
  }[expression] || null;

  const hatEl = {
    party:  <g><path d="M62 4 L51 30 L73 30 Z" fill="#ff5d8f"/><path d="M55 22 h14 M57 15 h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/><circle cx="62" cy="4" r="4" fill="#FFC83D"/></g>,
    wizard: <g><path d="M62 -2 L46 30 L78 30 Z" fill="#5b46a8"/><ellipse cx="62" cy="30" rx="21" ry="4.5" fill="#4a3890"/><path d="M62 10 l2 5 5 1 -5 1 -2 5 -2 -5 -5 -1 5 -1z" fill="#FFC83D"/></g>,
    crown:  <g><path d="M44 30 L44 12 L53 21 L62 8 L71 21 L80 12 L80 30 Z" fill="#FFC83D" stroke="#e0a800" strokeWidth="2" strokeLinejoin="round"/><circle cx="62" cy="22" r="2.6" fill="#e5484d"/><circle cx="50" cy="25" r="2" fill="#2b80d6"/><circle cx="74" cy="25" r="2" fill="#2b80d6"/></g>,
  }[HAT] || null;

  return (
    <svg width={size} height={size} viewBox="0 0 124 124" aria-hidden="true">
      {expression === "happy" && (
        <g className="pop">
          <path d="M16 26 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#FFC83D"/>
          <path d="M104 18 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#FFC83D"/>
        </g>
      )}
      <path d="M30 40 L26 14 L52 32 Z" fill={base}/><path d="M94 40 L98 14 L72 32 Z" fill={base}/>
      <path d="M34 36 L32 22 L46 32 Z" fill={inner}/><path d="M90 36 L92 22 L78 32 Z" fill={inner}/>
      <circle cx="62" cy="62" r="40" fill={base}/>
      <ellipse cx="62" cy="74" rx="30" ry="24" fill={muzzle}/>
      <path d="M62 24 v12 M50 26 l4 11 M74 26 l-4 11" stroke={deep} strokeWidth="4" strokeLinecap="round"/>
      <circle cx="38" cy="70" r="7" fill="#FF9FB0" opacity=".55"/><circle cx="86" cy="70" r="7" fill="#FF9FB0" opacity=".55"/>
      {eyes}
      {GLASSES && (
        <g stroke="#3A2A22" strokeWidth="2.5" fill="#cfe5ff" fillOpacity=".3">
          <circle cx="46" cy="58" r="11"/><circle cx="78" cy="58" r="11"/>
          <path d="M57 58 h10" fill="none"/><path d="M35 56 l-6 -3" fill="none"/><path d="M89 56 l6 -3" fill="none"/>
        </g>
      )}
      <path d="M58 64 h8 l-4 5 z" fill={deep}/>
      {speaking
        ? <ellipse className="mochi-talk" cx="62" cy="71" rx="6.5" ry="5" fill="#7a3b2e" style={{ transformOrigin: "62px 71px" }} />
        : mouth}
      <g stroke={whisker} strokeWidth="2" strokeLinecap="round"><path d="M30 64 h-14 M30 70 h-13 M94 64 h14 M94 70 h13"/></g>
      {expression === "read" && (
        <g className="bob">
          <circle cx="98" cy="84" r="13" fill="none" stroke="#6b4fb0" strokeWidth="4"/>
          <line x1="107" y1="93" x2="116" y2="102" stroke="#6b4fb0" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="98" cy="84" r="10" fill="#cfe5ff" opacity=".5"/>
        </g>
      )}
      {hatEl}
    </svg>
  );
}
