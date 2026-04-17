import { useState, useEffect } from "react";

const SPEED_DEFAULT_MHR = +(13716.69 * 0.3048).toFixed(2);

function calcTPH(weight, unit, speedMhr) {
  if (!weight || isNaN(weight) || !speedMhr || isNaN(speedMhr)) return null;
  const V   = parseFloat(speedMhr);
  const Vft = V / 0.3048;
  const w   = parseFloat(weight);
  switch (unit) {
    case "lb/ft": return (w * Vft) / 2204.62;
    case "lb/m":  return (w * V)   / 2204.62;
    case "kg/ft": return (w * Vft) / 1000;
    case "kg/m":  return (w * V)   / 1000;
    default: return null;
  }
}

const UNITS    = ["lb/ft", "lb/m", "kg/ft", "kg/m"];
const MAX_HIST = 10;

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtR(r) { return r < 10 ? r.toFixed(3) : r.toFixed(2); }

export default function MillCalculator() {
  const [weight,      setWeight]      = useState("");
  const [unit,        setUnit]        = useState("lb/ft");
  const [speed,       setSpeed]       = useState(String(SPEED_DEFAULT_MHR));
  const [editSpeed,   setEditSpeed]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [flash,       setFlash]       = useState(false);
  const [history,     setHistory]     = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const r = calcTPH(weight, unit, speed);
    setResult(r);
    if (r !== null) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 350);
      return () => clearTimeout(t);
    }
  }, [weight, unit, speed]);

  const handleSave = () => {
    if (result === null || isNaN(result) || weight === "") return;
    setHistory(prev =>
      [{ id: Date.now(), weight: parseFloat(weight), unit, result, ts: Date.now() }, ...prev].slice(0, MAX_HIST)
    );
  };

  const handleReset = () => { setWeight(""); setResult(null); };
  const resultFmt = result !== null && !isNaN(result) ? fmtR(result) : null;

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.icon}>⚙️</span>
          <div style={{ flex: 1 }}>
            <div style={s.title}>FEED RATE</div>
            <div style={s.subtitle}>Belt Sampler Calculator</div>
          </div>
          <button
            style={{ ...s.histBadge, ...(showHistory ? s.histBadgeOn : {}) }}
            onClick={() => setShowHistory(v => !v)}
          >📋 {history.length}</button>
        </div>

        {showHistory && (
          <div style={s.histPanel}>
            <div style={s.histHead}>
              <span style={s.label}>ÚLTIMOS CÁLCULOS</span>
              {history.length > 0 &&
                <button style={s.clearBtn} onClick={() => setHistory([])}>borrar todo</button>}
            </div>
            {history.length === 0
              ? <div style={s.histEmpty}>Sin registros aún</div>
              : history.map((h, i) => (
                <div key={h.id} style={{ ...s.histRow, ...(i > 0 ? s.histBorder : {}) }}>
                  <div>
                    <div style={s.histW}>{h.weight} <span style={s.histU}>{h.unit}</span></div>
                    <div style={s.histT}>{fmtTime(h.ts)}</div>
                  </div>
                  <div style={s.histRhs}>
                    <span style={s.histR}>{fmtR(h.result)}</span>
                    <span style={s.histTph}> t/h</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        <div style={s.speedRow}>
          <span style={s.label}>VELOCIDAD DE BANDA</span>
          {editSpeed ? (
            <div style={s.speedEdit}>
              <input
                style={s.speedInput} type="number" inputMode="decimal"
                value={speed} onChange={e => setSpeed(e.target.value)} autoFocus
              />
              <span style={s.speedUnit}>m/hr</span>
              <button style={s.okBtn} onClick={() => setEditSpeed(false)}>✓</button>
            </div>
          ) : (
            <button style={s.speedBtn} onClick={() => setEditSpeed(true)}>
              <span style={s.speedVal}>
                {parseFloat(speed).toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
              <span style={s.speedUnit}>m/hr</span>
              <span style={s.pencil}>✎</span>
            </button>
          )}
        </div>

        <div style={s.label}>UNIDAD DE ENTRADA</div>
        <div style={s.unitGrid}>
          {UNITS.map(u => (
            <button key={u}
              style={{ ...s.unitBtn, ...(unit === u ? s.unitOn : {}) }}
              onClick={() => setUnit(u)}>{u}</button>
          ))}
        </div>

        <div style={{ ...s.label, marginTop: "4px" }}>PESO DE MUESTRA ({unit})</div>
        <div style={s.inputRow}>
          <input
            style={s.weightInput} type="number" inputMode="decimal"
            placeholder="0.00" value={weight} onChange={e => setWeight(e.target.value)}
          />
          <span style={s.unitTag}>{unit}</span>
        </div>

        <div style={s.divider} />

        <div style={s.resultSec}>
          <div style={s.resultLabel}>ALIMENTACIÓN AL MOLINO</div>
          <div style={{ ...s.resultVal, ...(flash ? s.rFlash : {}), color: resultFmt ? "#f97316" : "#374151" }}>
            {resultFmt ?? "—"}
          </div>
          <div style={s.resultUnit}>t / h</div>
        </div>

        <div style={s.btnRow}>
          <button style={s.resetBtn} onClick={handleReset}>LIMPIAR</button>
          <button style={{ ...s.saveBtn, ...(!resultFmt ? s.saveDis : {}) }}
            onClick={handleSave} disabled={!resultFmt}>GUARDAR</button>
        </div>

        <div style={s.footer}>
          V = {parseFloat(speed).toLocaleString("en-US", { maximumFractionDigits: 2 })} m/hr
          &nbsp;|&nbsp; 1 t = 2,204.62 lb = 1,000 kg
        </div>
      </div>
    </div>
  );
}

const s = {
  root:        { minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', Courier, monospace", padding: "16px", position: "relative", overflow: "hidden" },
  bg:          { position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle at 20% 50%, #1e3a5f33 0%, transparent 50%), radial-gradient(circle at 80% 20%, #7c2d1233 0%, transparent 40%)" },
  card:        { width: "100%", maxWidth: "420px", background: "#1e293b", borderRadius: "16px", border: "1px solid #334155", padding: "24px 20px 20px", boxShadow: "0 25px 60px #00000080", position: "relative", zIndex: 1 },
  header:      { display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "18px" },
  icon:        { fontSize: "34px", lineHeight: 1 },
  title:       { fontSize: "22px", fontWeight: "bold", color: "#f97316", letterSpacing: "4px" },
  subtitle:    { fontSize: "11px", color: "#64748b", letterSpacing: "2px", marginTop: "2px" },
  histBadge:   { background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#64748b", fontSize: "12px", padding: "6px 10px", cursor: "pointer", fontFamily: "'Courier New', monospace", whiteSpace: "nowrap" },
  histBadgeOn: { border: "1px solid #f97316", color: "#fdba74", background: "#7c2d1240" },
  histPanel:   { background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px" },
  histHead:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  clearBtn:    { background: "none", border: "none", color: "#475569", fontSize: "10px", cursor: "pointer", fontFamily: "'Courier New', monospace", textDecoration: "underline", letterSpacing: "1px", padding: 0 },
  histEmpty:   { color: "#334155", fontSize: "12px", textAlign: "center", padding: "8px 0" },
  histRow:     { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" },
  histBorder:  { borderTop: "1px solid #1e293b" },
  histW:       { fontSize: "14px", color: "#94a3b8" },
  histU:       { fontSize: "11px", color: "#475569" },
  histT:       { fontSize: "10px", color: "#334155", marginTop: "2px" },
  histRhs:     { display: "flex", alignItems: "baseline" },
  histR:       { fontSize: "18px", color: "#f97316", fontWeight: "bold" },
  histTph:     { fontSize: "10px", color: "#64748b" },
  speedRow:    { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f172a", borderRadius: "10px", padding: "10px 14px", marginBottom: "20px", border: "1px solid #1e3a5f" },
  speedEdit:   { display: "flex", alignItems: "center", gap: "6px" },
  speedInput:  { background: "#0f172a", border: "1px solid #f97316", borderRadius: "6px", color: "#f0f0f0", fontSize: "14px", fontFamily: "'Courier New', monospace", padding: "4px 8px", width: "110px", outline: "none" },
  speedUnit:   { fontSize: "11px", color: "#475569" },
  okBtn:       { background: "#f97316", border: "none", borderRadius: "6px", color: "#fff", padding: "4px 10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" },
  speedBtn:    { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: 0 },
  speedVal:    { fontSize: "15px", color: "#94a3b8", fontFamily: "'Courier New', monospace" },
  pencil:      { fontSize: "14px", color: "#f97316", opacity: 0.8 },
  label:       { fontSize: "10px", color: "#475569", letterSpacing: "2px", marginBottom: "8px", display: "block" },
  unitGrid:    { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", marginBottom: "20px" },
  unitBtn:     { background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#64748b", padding: "12px 4px", fontSize: "13px", fontFamily: "'Courier New', monospace", cursor: "pointer", letterSpacing: "0.5px" },
  unitOn:      { background: "#7c2d12", border: "1px solid #f97316", color: "#fdba74" },
  inputRow:    { display: "flex", alignItems: "center", background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" },
  weightInput: { flex: 1, background: "none", border: "none", outline: "none", color: "#f0f0f0", fontSize: "24px", fontFamily: "'Courier New', monospace", padding: "16px", minWidth: 0 },
  unitTag:     { background: "#1e293b", color: "#475569", fontSize: "12px", padding: "0 14px", alignSelf: "stretch", display: "flex", alignItems: "center", borderLeft: "1px solid #334155", letterSpacing: "1px" },
  divider:     { height: "1px", background: "linear-gradient(90deg, transparent, #f97316, transparent)", marginBottom: "20px", opacity: 0.4 },
  resultSec:   { textAlign: "center", marginBottom: "20px" },
  resultLabel: { fontSize: "10px", color: "#475569", letterSpacing: "3px", marginBottom: "8px" },
  resultVal:   { fontSize: "58px", fontWeight: "bold", fontFamily: "'Courier New', monospace", letterSpacing: "-1px", lineHeight: 1, transition: "color 0.3s, transform 0.15s" },
  rFlash:      { transform: "scale(1.05)" },
  resultUnit:  { fontSize: "16px", color: "#64748b", letterSpacing: "3px", marginTop: "4px" },
  btnRow:      { display: "flex", gap: "10px", marginBottom: "16px" },
  resetBtn:    { flex: 1, background: "none", border: "1px solid #334155", borderRadius: "10px", color: "#475569", fontSize: "12px", letterSpacing: "3px", padding: "14px", cursor: "pointer", fontFamily: "'Courier New', monospace" },
  saveBtn:     { flex: 1, background: "#7c2d12", border: "1px solid #f97316", borderRadius: "10px", color: "#fdba74", fontSize: "12px", letterSpacing: "3px", padding: "14px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontWeight: "bold" },
  saveDis:     { opacity: 0.3, cursor: "not-allowed" },
  footer:      { textAlign: "center", fontSize: "10px", color: "#334155", letterSpacing: "1px" },
};
