import { useState } from "react";
import { ArrowLeft, Delete } from "lucide-react";
import Mochi from "./Mochi.jsx";
import * as speech from "../lib/speech.js";
import { useT } from "../lib/i18n.js";

export default function Calculator({ onClose }) {
  const t = useT();
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true); // next digit starts a new number

  const round = (n) => String(Math.round((n + Number.EPSILON) * 1e10) / 1e10);

  const inputDigit = (d) => { setDisplay(fresh || display === "0" ? d : display + d); setFresh(false); };
  const inputDot = () => { if (fresh) { setDisplay("0."); setFresh(false); return; } if (!display.includes(".")) setDisplay(display + "."); };
  const clearAll = () => { setDisplay("0"); setPrev(null); setOp(null); setFresh(true); };
  const backspace = () => { if (fresh) return; const next = display.length > 1 ? display.slice(0, -1) : "0"; setDisplay(next); if (next === "0") setFresh(true); };
  const toggleSign = () => setDisplay(display === "0" ? "0" : String(parseFloat(display) * -1));
  const percent = () => { setDisplay(round(parseFloat(display) / 100)); };

  const compute = (a, b, o) => o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : o === "÷" ? (b === 0 ? NaN : a / b) : b;

  function chooseOp(nextOp) {
    const cur = parseFloat(display);
    if (op && !fresh && prev != null) { const r = compute(parseFloat(prev), cur, op); const out = isNaN(r) ? "Error" : round(r); setDisplay(out); setPrev(out === "Error" ? null : out); }
    else setPrev(display);
    setOp(nextOp); setFresh(true);
  }
  function equals() {
    if (op == null || prev == null) return;
    const r = compute(parseFloat(prev), parseFloat(display), op);
    const out = isNaN(r) ? "Error" : round(r);
    setDisplay(out); setPrev(null); setOp(null); setFresh(true);
    speech.speak(out === "Error" ? "That doesn't work — try again." : `Equals ${out}`, { pitch: 1.1 });
  }

  const Key = ({ label, onClick, kind, aria }) => (
    <button className={`calckey ${kind || ""}`} onClick={onClick} aria-label={aria || (typeof label === "string" ? label : undefined)}>{label}</button>
  );

  return (
    <main>
      <button className="iconbtn" onClick={onClose} aria-label="Back" style={{ marginTop: 8 }}><ArrowLeft size={20} /></button>
      <div className="greet" style={{ marginTop: 4 }}>
        <Mochi size={76} expression="think" />
        <h2 className="fred" style={{ marginTop: 6 }}>{t("Calculator 🧮")}</h2>
        <p>{t("Maths helper")}</p>
      </div>
      <div className="calcdisp" aria-live="polite">
        <div className="calcprev">{op ? `${prev} ${op}` : "\u00A0"}</div>
        <div className="calcnum">{display}</div>
      </div>
      <div className="calcgrid">
        <Key label="AC" kind="fn" onClick={clearAll} aria="All clear" />
        <Key label="+/−" kind="fn" onClick={toggleSign} aria="Toggle sign" />
        <Key label="%" kind="fn" onClick={percent} aria="Percent" />
        <Key label="÷" kind="op" onClick={() => chooseOp("÷")} aria="Divide" />

        <Key label="7" onClick={() => inputDigit("7")} />
        <Key label="8" onClick={() => inputDigit("8")} />
        <Key label="9" onClick={() => inputDigit("9")} />
        <Key label="×" kind="op" onClick={() => chooseOp("×")} aria="Multiply" />

        <Key label="4" onClick={() => inputDigit("4")} />
        <Key label="5" onClick={() => inputDigit("5")} />
        <Key label="6" onClick={() => inputDigit("6")} />
        <Key label="−" kind="op" onClick={() => chooseOp("−")} aria="Subtract" />

        <Key label="1" onClick={() => inputDigit("1")} />
        <Key label="2" onClick={() => inputDigit("2")} />
        <Key label="3" onClick={() => inputDigit("3")} />
        <Key label="+" kind="op" onClick={() => chooseOp("+")} aria="Add" />

        <Key label={<Delete size={22} />} onClick={backspace} aria="Backspace" />
        <Key label="0" onClick={() => inputDigit("0")} />
        <Key label="." onClick={inputDot} aria="Decimal point" />
        <Key label="=" kind="eq" onClick={equals} aria="Equals" />
      </div>
      <p className="muted" style={{ textAlign: "center", marginTop: 12 }}>{t("Tip: tap = and Mochi reads the answer aloud.")}</p>
    </main>
  );
}
