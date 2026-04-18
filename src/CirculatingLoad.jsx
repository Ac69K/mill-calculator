import { useState, useEffect, useMemo, Fragment } from "react";

// ---------- Storage keys ----------
const STORAGE_CURRENT = "cc-current-v2";
const STORAGE_HISTORY = "cc-history-v2";
const MAX_HISTORY = 50;

// ---------- Structure ----------
const SUB = [
  { key: "solidos", label: "% Sólidos" },
  { key: "malla",   label: "Malla 200" }
];
const H = [1, 2, 3, 4, 5, 6, 7];

const emptyData = () => ({
  label: "",
  solidos: { alim: "", of: Array(7).fill(""), uf: Array(7).fill("") },
  malla:   { alim: "", of: Array(7).fill(""), uf: Array(7).fill("") }
});

// ---------- Persistence ----------
const loadCurrent = () => {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT);
    if (!raw) return emptyData();
    const p = JSON.parse(raw);
    const ok =
      p && typeof p === "object" &&
      p.solidos && p.malla &&
      Array.isArray(p.solidos.of) && p.solidos.of.length === 7 &&
      Array.isArray(p.solidos.uf) && p.solidos.uf.length === 7 &&
      Array.isArray(p.malla.of)   && p.malla.of.length   === 7 &&
      Array.isArray(p.malla.uf)   && p.malla.uf.length   === 7;
    if (!ok) return emptyData();
    return {
      label: typeof p.label === "string" ? p.label : "",
      solidos: p.solidos,
      malla: p.malla
    };
  } catch {
    return emptyData();
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

// ---------- Math helpers ----------
const toNum = (v) => {
  if (v === "" || v == null) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
};

// Promedio ignora vacíos y ceros → ciclón fuera de servicio: dejar vacío
const avg = (arr) => {
  const nums = arr.map(toNum).filter((v) => v !== null && v > 0);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

// CC % Sólidos = ((1/OF − 1/Alim) / (1/Alim − 1/UF)) × 100
const ccSolidos = (alim, of_, uf_) => {
  if (alim === null || alim <= 0 || of_ === null || of_ <= 0 || uf_ === null || uf_ <= 0) return null;
  const num = 1 / of_ - 1 / alim;
  const den = 1 / alim - 1 / uf_;
  if (den === 0) return null;
  const r = (num / den) * 100;
  return isFinite(r) ? r : null;
};

// CC Malla 200 = ((OF − Alim) / (Alim − UF)) × 100
const ccMalla = (alim, of_, uf_) => {
  if (alim === null || of_ === null || uf_ === null) return null;
  const num = of_ - alim;
  const den = alim - uf_;
  if (den === 0) return null;
  const r = (num / den) * 100;
  return isFinite(r) ? r : null;
};

const fmt   = (v) => (v === null ? "—" : v.toFixed(2));
const fmtCC = (v) => (v === null ? "—" : v.toFixed(1));

const formatDate = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ====================== COMPONENT ======================
export default function CirculatingLoad() {
  const [data, setData] = useState(() =>
    typeof window !== "undefined" ? loadCurrent() : emptyData()
  );
  const [history, setHistory] = useState(() =>
    typeof window !== "undefined" ? loadHistory() : []
  );
  const [savedFlash, setSavedFlash] = useState(false);

  // Auto-save current form on every change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_CURRENT, JSON.stringify(data)); } catch {}
  }, [data]);

  // Persist history on every change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history)); } catch {}
  }, [history]);

  // Derived values
  const computed = useMemo(() => {
    const res = {};
    SUB.forEach(({ key }) => {
      const alim   = toNum(data[key].alim);
      const promOf = avg(data[key].of);
      const promUf = avg(data[key].uf);
      const cc =
        key === "solidos"
          ? ccSolidos(alim, promOf, promUf)
          : ccMalla(alim, promOf, promUf);
      res[key] = { promOf, promUf, cc };
    });
    return res;
  }, [data]);

  // ---------- Handlers ----------
  const update = (subKey, field, hi, value) => {
    let v = value.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");

    setData((d) => {
      const copy = {
        label: d.label,
        solidos: { alim: d.solidos.alim, of: [...d.solidos.of], uf: [...d.solidos.uf] },
        malla:   { alim: d.malla.alim,   of: [...d.malla.of],   uf: [...d.malla.uf] }
      };
      if (field === "alim") copy[subKey].alim = v;
      else copy[subKey][field][hi] = v;
      return copy;
    });
  };

  const updateLabel = (value) => setData((d) => ({ ...d, label: value }));

  const saveToHistory = () => {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      savedAt: new Date().toISOString(),
      label: data.label.trim() || `Turno ${formatDate(new Date().toISOString())}`,
      data: {
        solidos: {
          alim: data.solidos.alim,
          of: [...data.solidos.of],
          uf: [...data.solidos.uf]
        },
        malla: {
          alim: data.malla.alim,
          of: [...data.malla.of],
          uf: [...data.malla.uf]
        }
      },
      ccSolidos: computed.solidos.cc,
      ccMalla:   computed.malla.cc
    };
    setHistory((h) => [entry, ...h].slice(0, MAX_HISTORY));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  const loadEntry = (entry) => {
    setData({
      label: entry.label,
      solidos: {
        alim: entry.data.solidos.alim,
        of:   [...entry.data.solidos.of],
        uf:   [...entry.data.solidos.uf]
      },
      malla: {
        alim: entry.data.malla.alim,
        of:   [...entry.data.malla.of],
        uf:   [...entry.data.malla.uf]
      }
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const deleteEntry = (id) => setHistory((h) => h.filter((e) => e.id !== id));

  const clearForm = () => {
    if (window.confirm("¿Limpiar todos los campos del formulario?")) {
      setData(emptyData());
    }
  };

  const canSave = computed.solidos.cc !== null || computed.malla.cc !== null;

  // ====================== RENDER ======================
  return (
    <div style={styles.root}>
      <div style={styles.bgPattern} />

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>♻</div>
          <div>
            <div style={styles.title}>CARGA CIRCULANTE</div>
            <div style={styles.subtitle}>Hidrociclones · 7 unidades</div>
          </div>
        </div>

        {/* Label */}
        <div style={styles.labelGroup}>
          <label style={styles.labelSmall}>ETIQUETA DEL TURNO (OPCIONAL)</label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => updateLabel(e.target.value)}
            placeholder="Ej. Turno A · mañana · operador JP"
            style={styles.labelInput}
            maxLength={80}
          />
        </div>

        {/* Matrix */}
        <div style={styles.matrixScroll}>
          <div style={styles.matrix}>
            <div style={styles.cornerCell}>
              <span style={styles.cornerText}>CICLÓN</span>
            </div>
            {SUB.map((s) => (
              <div key={s.key} style={styles.subHeader}>{s.label}</div>
            ))}

            <div style={{ ...styles.rowLabel, ...styles.rowLabelAlim }}>% Alim</div>
            {SUB.map((s) => (
              <div key={`al-${s.key}`} style={{ ...styles.cell, ...styles.cellAlim }}>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={data[s.key].alim}
                  onChange={(e) => update(s.key, "alim", 0, e.target.value)}
                  style={styles.input}
                  placeholder="—"
                />
              </div>
            ))}

            {H.map((h, hi) => (
              <Fragment key={`of-${h}`}>
                <div style={styles.rowLabel}>%OF H{h}</div>
                {SUB.map((s) => (
                  <div key={`of-${s.key}-${hi}`} style={styles.cell}>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={data[s.key].of[hi]}
                      onChange={(e) => update(s.key, "of", hi, e.target.value)}
                      style={styles.input}
                      placeholder="—"
                    />
                  </div>
                ))}
              </Fragment>
            ))}

            <div style={{ ...styles.rowLabel, ...styles.rowLabelAvg }}>PROM OF</div>
            {SUB.map((s) => (
              <div key={`pof-${s.key}`} style={{ ...styles.cell, ...styles.cellAvg }}>
                {fmt(computed[s.key].promOf)}
              </div>
            ))}

            {H.map((h, hi) => (
              <Fragment key={`uf-${h}`}>
                <div style={styles.rowLabel}>%UF H{h}</div>
                {SUB.map((s) => (
                  <div key={`uf-${s.key}-${hi}`} style={styles.cell}>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={data[s.key].uf[hi]}
                      onChange={(e) => update(s.key, "uf", hi, e.target.value)}
                      style={styles.input}
                      placeholder="—"
                    />
                  </div>
                ))}
              </Fragment>
            ))}

            <div style={{ ...styles.rowLabel, ...styles.rowLabelAvg }}>PROM UF</div>
            {SUB.map((s) => (
              <div key={`puf-${s.key}`} style={{ ...styles.cell, ...styles.cellAvg }}>
                {fmt(computed[s.key].promUf)}
              </div>
            ))}

            <div style={{ ...styles.rowLabel, ...styles.rowLabelCC }}>CC %</div>
            {SUB.map((s) => (
              <div key={`cc-${s.key}`} style={{ ...styles.cell, ...styles.cellCC }}>
                {fmtCC(computed[s.key].cc)}
              </div>
            ))}
          </div>
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
          <button onClick={clearForm} style={styles.clearBtn}>LIMPIAR</button>
        </div>

        {/* History */}
        <div style={styles.historySection}>
          <div style={styles.historyHeader}>
            <span style={styles.historyTitle}>HISTORIAL</span>
            <span style={styles.historyCount}>{history.length} / {MAX_HISTORY}</span>
          </div>

          {history.length === 0 ? (
            <div style={styles.historyEmpty}>
              Aún no hay turnos guardados.<br/>
              Llena la matriz y toca <strong style={{color:"#fdba74"}}>GUARDAR EN HISTORIAL</strong>.
            </div>
          ) : (
            <div style={styles.historyList}>
              {history.map((entry) => (
                <div key={entry.id} style={styles.historyItem}>
                  <div style={styles.historyItemHeader}>
                    <div style={styles.historyItemLabel}>{entry.label}</div>
                    <div style={styles.historyItemDate}>{formatDate(entry.savedAt)}</div>
                  </div>
                  <div style={styles.historyItemCC}>
                    <div style={styles.historyCCBlock}>
                      <span style={styles.historyCCLabel}>% SÓL</span>
                      <span style={styles.historyCCValue}>{fmtCC(entry.ccSolidos)}</span>
                    </div>
                    <div style={styles.historyCCBlock}>
                      <span style={styles.historyCCLabel}>M 200</span>
                      <span style={styles.historyCCValue}>{fmtCC(entry.ccMalla)}</span>
                    </div>
                  </div>
                  <div style={styles.historyItemActions}>
                    <button onClick={() => loadEntry(entry)} style={styles.historyLoadBtn}>
                      ↻ CARGAR
                    </button>
                    <button onClick={() => deleteEntry(entry.id)} style={styles.historyDelBtn}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          CC % SÓLIDOS = (1/OF − 1/ALIM) ÷ (1/ALIM − 1/UF) × 100<br/>
          CC MALLA 200 = (OF − ALIM) ÷ (ALIM − UF) × 100<br/>
          <span style={{ opacity: 0.6 }}>
            Ciclón fuera de servicio: dejar vacío · Datos guardados localmente
          </span>
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
    maxWidth: "560px",
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

  labelGroup: { marginBottom: "18px" },
  labelSmall: {
    display: "block",
    fontSize: "9px",
    color: "#475569",
    letterSpacing: "2px",
    marginBottom: "6px",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },
  labelInput: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#f0f0f0",
    padding: "10px 12px",
    fontSize: "13px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    outline: "none"
  },

  matrixScroll: {
    overflowX: "auto",
    marginBottom: "18px",
    WebkitOverflowScrolling: "touch",
    borderRadius: "8px"
  },
  matrix: {
    display: "grid",
    gridTemplateColumns: "90px 1fr 1fr",
    gap: "1px",
    background: "#334155",
    border: "1px solid #334155",
    borderRadius: "8px",
    overflow: "hidden",
    minWidth: "300px"
  },
  cornerCell: {
    background: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 4px"
  },
  cornerText: {
    fontSize: "9px",
    color: "#475569",
    letterSpacing: "2px",
    fontWeight: "bold"
  },
  subHeader: {
    background: "#7c2d12",
    color: "#fdba74",
    fontSize: "11px",
    letterSpacing: "2px",
    padding: "12px 4px",
    textAlign: "center",
    fontWeight: "bold",
    borderBottom: "1px solid #f97316"
  },
  rowLabel: {
    background: "#0f172a",
    color: "#64748b",
    fontSize: "10px",
    letterSpacing: "1px",
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },
  rowLabelAlim: { color: "#fdba74", background: "#1e293b" },
  rowLabelAvg:  { color: "#cbd5e1", background: "#1e293b", borderTop: "1px solid #334155" },
  rowLabelCC: {
    color: "#f97316",
    background: "#1e293b",
    fontSize: "12px",
    letterSpacing: "2px",
    borderTop: "1px solid #f97316"
  },
  cell: {
    background: "#0a0f1d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Courier New', monospace",
    fontSize: "14px"
  },
  cellAlim: { background: "#0f172a" },
  cellAvg: {
    background: "#1e293b",
    color: "#cbd5e1",
    padding: "10px 4px",
    fontWeight: "bold",
    borderTop: "1px solid #334155"
  },
  cellCC: {
    background: "#7c2d12",
    color: "#fdba74",
    padding: "14px 4px",
    fontWeight: "bold",
    fontSize: "16px",
    borderTop: "1px solid #f97316"
  },
  input: {
    width: "100%",
    height: "40px",
    background: "none",
    border: "none",
    outline: "none",
    color: "#f0f0f0",
    fontSize: "14px",
    fontFamily: "'Courier New', monospace",
    textAlign: "center",
    padding: "0 4px"
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
    transition: "background 0.2s, color 0.2s, border-color 0.2s"
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
    lineHeight: 1.8,
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
    gap: "10px",
    marginBottom: "8px"
  },
  historyItemLabel: {
    fontSize: "13px",
    color: "#e2e8f0",
    fontWeight: "600",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    minWidth: 0
  },
  historyItemDate: {
    fontSize: "10px",
    color: "#64748b",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "1px",
    flexShrink: 0
  },
  historyItemCC: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "10px"
  },
  historyCCBlock: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "8px 10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  historyCCLabel: {
    fontSize: "9px",
    color: "#64748b",
    letterSpacing: "2px",
    fontWeight: "bold"
  },
  historyCCValue: {
    fontSize: "14px",
    color: "#fdba74",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
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
  }
};
