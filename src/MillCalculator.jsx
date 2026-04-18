import { useState, useEffect, useMemo } from "react";

// ---------- Constants ----------
const SPEED_DEFAULT_FT_HR = 13716.69; // ft/hr - especificación original de la banda
const FT_TO_M = 0.3048;

const STORAGE_CURRENT = "mill-current-v2";
const STORAGE_HISTORY = "mill-history-v2";
const STORAGE_SPEED   = "mill-speed-v2";
const MAX_HISTORY = 10;

const UNITS = [
  { key: "lb/ft", label: "lb/ft" },
  { key: "lb/m",  label: "lb/m"  },
  { key: "kg/ft", label: "kg/ft" },
  { key: "kg/m",  label: "kg/m"  }
];

// ---------- Math ----------
function calcTPH(weightStr, unit, speedFtHrStr) {
  const w = parseFloat(String(weightStr).replace(",", "."));
  const v = parseFloat(String(speedFtHrStr).replace(",", "."));
  if (!isFinite(w) || !isFinite(v) || w <= 0 || v <= 0) return null;

  const speedMHr = v * FT_TO_M;

  switch (unit) {
    case "lb/ft": return (w * v) / 2204.62;
    case "lb/m":  return (w * speedMHr) / 2204.62;
    case "kg/ft": return (w * v) / 1000;
    case "kg/m":  return (w * speedMHr) / 1000;
    default: return null;
  }
}

// ---------- Persistence ----------
const loadCurrent = () => {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT);
    if (!raw) return { weight: "", unit: "lb/ft" };
    const p = JSON.parse(raw);
    return {
      weight: typeof p.weight === "string" ? p.weight : "",
      unit: UNITS.some(u => u.key === p.unit) ? p.unit : "lb/ft"
    };
  } catch {
    return { weight: "", unit: "lb/ft" };
  }
};

const loadSpeed = () => {
  try {
    const raw = localStorage.getItem(STORAGE_SPEED);
    if (!raw) return String(SPEED_DEFAULT_FT_HR);
    const n = parseFloat(raw);
    if (!isFinite(n) || n <= 0) return String(SPEED_DEFAULT_FT_HR);
    return String(raw);
  } catch {
    return String(SPEED_DEFAULT_FT_HR);
  }
};

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

const formatDate = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatTPH = (v) =>
  v === null ? "—" : v < 10 ? v.toFixed(3) : v.toFixed(2);

// ====================== COMPONENT ======================
export default function MillCalculator() {
  const [current, setCurrent] = useState(() =>
    typeof window !== "undefined" ? loadCurrent() : { weight: "", unit: "lb/ft" }
  );
  const [speed, setSpeed] = useState(() =>
    typeof window !== "undefined" ? loadSpeed() : String(SPEED_DEFAULT_FT_HR)
  );
  const [history, setHistory] = useState(() =>
    typeof window !== "undefined" ? loadHistory() : []
  );
  const [editingSpeed, setEditingSpeed] = useState(false);
  const [speedDraft, setSpeedDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // ---- Persistence effects ----
  useEffect(() => {
    try { localStorage.setItem(STORAGE_CURRENT, JSON.stringify(current)); } catch {}
  }, [current]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_SPEED, speed); } catch {}
  }, [speed]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history)); } catch {}
  }, [history]);

  // ---- Derived ----
  const result = useMemo(
    () => calcTPH(current.weight, current.unit, speed),
    [current.weight, current.unit, speed]
  );

  const speedMHr = useMemo(() => {
    const v = parseFloat(speed);
    return isFinite(v) ? v * FT_TO_M : 0;
  }, [speed]);

  // ---- Handlers ----
  const sanitizeNumber = (value) => {
    let v = value.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    return v;
  };

  const updateWeight = (value) => {
    setCurrent((c) => ({ ...c, weight: sanitizeNumber(value) }));
  };

  const updateUnit = (unit) => setCurrent((c) => ({ ...c, unit }));

  const startEditSpeed = () => {
    setSpeedDraft(speed);
    setEditingSpeed(true);
  };

  const saveSpeed = () => {
    const v = sanitizeNumber(speedDraft);
    const n = parseFloat(v);
    if (isFinite(n) && n > 0) setSpeed(v);
    setEditingSpeed(false);
  };

  const cancelEditSpeed = () => setEditingSpeed(false);

  const resetSpeed = () => {
    setSpeed(String(SPEED_DEFAULT_FT_HR));
    setEditingSpeed(false);
  };

  const clearWeight = () => {
    setCurrent((c) => ({ ...c, weight: "" }));
  };

  const saveToHistory = () => {
    if (result === null) return;
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      savedAt: new Date().toISOString(),
      weight: current.weight,
      unit: current.unit,
      speed,
      result
    };
    setHistory((h) => [entry, ...h].slice(0, MAX_HISTORY));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const loadEntry = (entry) => {
    setCurrent({ weight: entry.weight, unit: entry.unit });
    setSpeed(entry.speed);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const deleteEntry = (id) =>
    setHistory((h) => h.filter((e) => e.id !== id));

  const canSave = result !== null;
  const speedIsDefault = parseFloat(speed) === SPEED_DEFAULT_FT_HR;

  // ====================== RENDER ======================
  return (
    <div style={styles.root}>
      <div style={styles.bgPattern} />

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>⚙</div>
          <div>
            <div style={styles.title}>FEED RATE</div>
            <div style={styles.subtitle}>Belt cut calibration</div>
          </div>
        </div>

        {/* Speed */}
        <div style={styles.speedRow}>
          <span style={styles.speedLabel}>VELOCIDAD BANDA</span>
          {editingSpeed ? (
            <div style={styles.speedEdit}>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={speedDraft}
                onChange={(e) => setSpeedDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveSpeed();
                  if (e.key === "Escape") cancelEditSpeed();
                }}
                style={styles.speedInput}
                autoFocus
              />
              <span style={styles.speedEditUnit}>ft/hr</span>
              <button onClick={saveSpeed} style={styles.okBtn}>OK</button>
            </div>
          ) : (
            <button onClick={startEditSpeed} style={styles.speedBtn}>
              <span style={styles.speedVal}>
                {speedMHr.toFixed(0)} <span style={styles.speedUnit}>m/hr</span>
              </span>
              <span style={styles.pencil}>✎</span>
            </button>
          )}
        </div>

        <div style={styles.divider} />

        {/* Unit */}
        <label style={styles.label}>UNIDAD DE MUESTRA</label>
        <div style={styles.unitGrid}>
          {UNITS.map((u) => (
            <button
              key={u.key}
              onClick={() => updateUnit(u.key)}
              style={{
                ...styles.unitBtn,
                ...(current.unit === u.key ? styles.unitOn : {})
              }}
            >
              {u.label}
            </button>
          ))}
        </div>

        {/* Weight */}
        <label style={styles.label}>PESO DE MUESTRA</label>
        <div style={styles.inputRow}>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={current.weight}
            onChange={(e) => updateWeight(e.target.value)}
            style={styles.weightInput}
            placeholder="0.00"
          />
          <div style={styles.unitTag}>{current.unit.toUpperCase()}</div>
        </div>

        <div style={styles.divider} />

        {/* Result */}
        <div style={styles.resultSection}>
          <div style={styles.resultLabel}>FEED RATE</div>
          <div
            style={{
              ...styles.resultValue,
              color: result !== null ? "#fdba74" : "#334155"
            }}
          >
            {formatTPH(result)}
          </div>
          <div style={styles.resultUnit}>T/H</div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            onClick={saveToHistory}
            disabled={!canSave}
            style={{
              ...styles.saveBtn,
              ...(savedFlash ? styles.saveBtnFlash : {}),
              ...(canSave ? {} : styles.btnDisabled)
            }}
          >
            {savedFlash ? "✓ GUARDADO" : "GUARDAR EN HISTORIAL"}
          </button>
          <button onClick={clearWeight} style={styles.clearBtn}>LIMPIAR</button>
        </div>

        {/* History */}
        <div style={styles.historySection}>
          <div style={styles.historyHeader}>
            <span style={styles.historyTitle}>HISTORIAL</span>
            <span style={styles.historyCount}>
              {history.length} / {MAX_HISTORY}
            </span>
          </div>

          {history.length === 0 ? (
            <div style={styles.historyEmpty}>
              Aún no hay cálculos guardados.
            </div>
          ) : (
            <div style={styles.historyList}>
              {history.map((entry) => (
                <div key={entry.id} style={styles.historyItem}>
                  <div style={styles.historyItemHeader}>
                    <div style={styles.historyItemValue}>
                      {formatTPH(entry.result)}{" "}
                      <span style={styles.historyItemValueUnit}>t/h</span>
                    </div>
                    <div style={styles.historyItemDate}>
                      {formatDate(entry.savedAt)}
                    </div>
                  </div>
                  <div style={styles.historyItemDetails}>
                    {entry.weight || "—"} {entry.unit}
                  </div>
                  <div style={styles.historyItemActions}>
                    <button
                      onClick={() => loadEntry(entry)}
                      style={styles.historyLoadBtn}
                    >
                      ↻ CARGAR
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      style={styles.historyDelBtn}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {!speedIsDefault && (
            <button onClick={resetSpeed} style={styles.resetSpeedBtn}>
              ↺ Restaurar velocidad por defecto
            </button>
          )}
          <div style={{ marginTop: speedIsDefault ? 0 : 10 }}>
            Belt cut calibration · Datos guardados localmente
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================== STYLES ======================
const styles = {
  root: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)",
    padding: "20px 12px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#f0f0f0",
    position: "relative",
    overflowX: "hidden"
  },
  bgPattern: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(#334155 1px, transparent 1px)",
    backgroundSize: "22px 22px",
    opacity: 0.12,
    pointerEvents: "none"
  },
  card: {
    maxWidth: "480px",
    margin: "0 auto",
    background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "20px",
    position: "relative",
    boxShadow: "0 10px 40px rgba(0,0,0,0.4)"
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "18px",
    paddingBottom: "16px",
    borderBottom: "1px solid #334155"
  },
  headerIcon: { fontSize: "28px", color: "#f97316", lineHeight: 1 },
  title:      { fontSize: "14px", letterSpacing: "3px", color: "#f0f0f0", fontWeight: "bold" },
  subtitle:   { fontSize: "10px", letterSpacing: "2px", color: "#64748b", marginTop: "3px" },

  speedRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    minHeight: "36px"
  },
  speedLabel: {
    fontSize: "9px",
    color: "#475569",
    letterSpacing: "2px",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },
  speedBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: 0
  },
  speedVal: {
    fontSize: "15px",
    color: "#94a3b8",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },
  speedUnit: {
    fontSize: "11px",
    color: "#475569",
    letterSpacing: "1px"
  },
  pencil: { fontSize: "14px", color: "#f97316", opacity: 0.8 },
  speedEdit: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  speedInput: {
    background: "#0f172a",
    border: "1px solid #f97316",
    borderRadius: "6px",
    color: "#f0f0f0",
    fontSize: "14px",
    fontFamily: "'Courier New', monospace",
    padding: "6px 8px",
    width: "110px",
    outline: "none"
  },
  speedEditUnit: {
    fontSize: "11px",
    color: "#475569",
    fontFamily: "'Courier New', monospace"
  },
  okBtn: {
    background: "#f97316",
    border: "none",
    borderRadius: "6px",
    color: "#1a0a03",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "1px"
  },

  divider: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, #f97316, transparent)",
    marginBottom: "18px",
    marginTop: "6px",
    opacity: 0.4
  },

  label: {
    display: "block",
    fontSize: "9px",
    color: "#475569",
    letterSpacing: "2px",
    marginBottom: "8px",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },
  unitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    marginBottom: "18px"
  },
  unitBtn: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#64748b",
    padding: "12px 4px",
    fontSize: "12px",
    fontFamily: "'Courier New', monospace",
    cursor: "pointer",
    letterSpacing: "0.5px",
    transition: "all 0.15s"
  },
  unitOn: {
    background: "#7c2d12",
    border: "1px solid #f97316",
    color: "#fdba74",
    fontWeight: "bold"
  },

  inputRow: {
    display: "flex",
    alignItems: "stretch",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "18px"
  },
  weightInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: "#f0f0f0",
    fontSize: "24px",
    fontFamily: "'Courier New', monospace",
    padding: "14px 16px",
    minWidth: 0
  },
  unitTag: {
    background: "#1e293b",
    color: "#64748b",
    fontSize: "11px",
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
    borderLeft: "1px solid #334155",
    letterSpacing: "1px",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },

  resultSection: {
    textAlign: "center",
    marginBottom: "20px"
  },
  resultLabel: {
    fontSize: "10px",
    color: "#475569",
    letterSpacing: "3px",
    marginBottom: "6px",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },
  resultValue: {
    fontSize: "54px",
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "-1px",
    lineHeight: 1,
    transition: "color 0.3s"
  },
  resultUnit: {
    fontSize: "14px",
    color: "#64748b",
    letterSpacing: "3px",
    marginTop: "6px",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },

  actions: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
    marginBottom: "20px"
  },
  saveBtn: {
    background: "#f97316",
    border: "1px solid #f97316",
    borderRadius: "10px",
    color: "#1a0a03",
    fontSize: "12px",
    letterSpacing: "3px",
    padding: "14px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold",
    transition: "all 0.2s"
  },
  saveBtnFlash: {
    background: "#16a34a",
    borderColor: "#16a34a",
    color: "#f0fdf4"
  },
  btnDisabled: {
    background: "#334155",
    borderColor: "#334155",
    color: "#64748b",
    cursor: "not-allowed"
  },
  clearBtn: {
    background: "none",
    border: "1px solid #334155",
    borderRadius: "10px",
    color: "#475569",
    fontSize: "11px",
    letterSpacing: "2px",
    padding: "14px 16px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace"
  },

  historySection: {
    borderTop: "1px solid #334155",
    paddingTop: "18px",
    marginBottom: "18px"
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "12px"
  },
  historyTitle: {
    fontSize: "11px",
    color: "#94a3b8",
    letterSpacing: "3px",
    fontWeight: "bold"
  },
  historyCount: {
    fontSize: "10px",
    color: "#475569",
    fontFamily: "'Courier New', monospace"
  },
  historyEmpty: {
    padding: "24px 16px",
    textAlign: "center",
    color: "#475569",
    fontSize: "12px",
    background: "#0f172a",
    border: "1px dashed #334155",
    borderRadius: "10px"
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  historyItem: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "12px"
  },
  historyItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "4px"
  },
  historyItemValue: {
    fontSize: "18px",
    color: "#fdba74",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },
  historyItemValueUnit: {
    fontSize: "10px",
    color: "#64748b",
    letterSpacing: "2px",
    marginLeft: "2px"
  },
  historyItemDate: {
    fontSize: "10px",
    color: "#64748b",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "1px"
  },
  historyItemDetails: {
    fontSize: "11px",
    color: "#94a3b8",
    fontFamily: "'Courier New', monospace",
    marginBottom: "10px"
  },
  historyItemActions: {
    display: "flex",
    gap: "8px"
  },
  historyLoadBtn: {
    flex: 1,
    background: "none",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#94a3b8",
    fontSize: "10px",
    letterSpacing: "2px",
    padding: "8px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },
  historyDelBtn: {
    background: "none",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#475569",
    fontSize: "14px",
    padding: "8px 14px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace"
  },

  footer: {
    textAlign: "center",
    fontSize: "9px",
    color: "#475569",
    letterSpacing: "1px",
    lineHeight: 1.8,
    fontFamily: "'Courier New', monospace"
  },
  resetSpeedBtn: {
    background: "none",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#64748b",
    fontSize: "10px",
    letterSpacing: "2px",
    padding: "8px 14px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace"
  }
};
