import { useState, useEffect } from "react";
import MillCalculator from "./MillCalculator.jsx";
import CirculatingLoad from "./CirculatingLoad.jsx";

const SCREEN_KEY = "app-screen-v1";

const CALCULATORS = [
  {
    id: "mill",
    icon: "⚙",
    title: "FEED RATE",
    subtitle: "Calibración de pesómetro · belt cut",
    component: MillCalculator
  },
  {
    id: "cc",
    icon: "♻",
    title: "CARGA CIRCULANTE",
    subtitle: "Hidrociclones · 7 unidades",
    component: CirculatingLoad
  }
];

export default function App() {
  const [screen, setScreen] = useState(() => {
    if (typeof window === "undefined") return "home";
    try {
      const s = localStorage.getItem(SCREEN_KEY);
      if (s === "home" || CALCULATORS.some((c) => c.id === s)) return s;
    } catch {}
    return "home";
  });

  useEffect(() => {
    try { localStorage.setItem(SCREEN_KEY, screen); } catch {}
  }, [screen]);

  const active = CALCULATORS.find((c) => c.id === screen);

  // --------- Vista de calculadora activa ---------
  if (active) {
    const Component = active.component;
    return (
      <div style={styles.wrap}>
        <div style={styles.topbar}>
          <button
            onClick={() => setScreen("home")}
            style={styles.backBtn}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "#f97316";
              e.currentTarget.style.color = "#fdba74";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "#334155";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            ← MENÚ
          </button>
          <span style={styles.topbarTitle}>{active.title}</span>
          <span style={styles.topbarSpacer} />
        </div>
        <Component />
      </div>
    );
  }

  // --------- Menú principal (home) ---------
  return (
    <div style={styles.home}>
      <div style={styles.bgPattern} />
      <div style={styles.homeContent}>
        <div style={styles.homeHeader}>
          <div style={styles.homeLogo}>◆</div>
          <div style={styles.homeTitle}>
            PROCESS
            <br />
            CALCULATORS
          </div>
          <div style={styles.homeSubtitle}>Concentradora · Molienda</div>
        </div>

        <div style={styles.cardList}>
          {CALCULATORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setScreen(c.id)}
              style={styles.calcCard}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#f97316";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#334155";
              }}
            >
              <div style={styles.cardIcon}>{c.icon}</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>{c.title}</div>
                <div style={styles.cardSubtitle}>{c.subtitle}</div>
              </div>
              <div style={styles.cardArrow}>→</div>
            </button>
          ))}
        </div>

        <div style={styles.homeFooter}>más cálculos próximamente</div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    background: "#020617"
  },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#020617",
    borderBottom: "1px solid #334155",
    padding: "12px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  backBtn: {
    background: "none",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#94a3b8",
    fontSize: "11px",
    letterSpacing: "2px",
    padding: "8px 14px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold",
    transition: "border-color 0.2s, color 0.2s"
  },
  topbarTitle: {
    fontSize: "10px",
    color: "#64748b",
    letterSpacing: "3px",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold"
  },
  topbarSpacer: { width: 72 },

  home: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)",
    padding: "40px 16px",
    position: "relative",
    overflowX: "hidden",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#f0f0f0"
  },
  bgPattern: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(#334155 1px, transparent 1px)",
    backgroundSize: "22px 22px",
    opacity: 0.12,
    pointerEvents: "none"
  },
  homeContent: {
    maxWidth: "480px",
    margin: "0 auto",
    position: "relative"
  },
  homeHeader: {
    textAlign: "center",
    marginBottom: "40px",
    paddingTop: "20px"
  },
  homeLogo: {
    fontSize: "42px",
    color: "#f97316",
    marginBottom: "16px",
    lineHeight: 1,
    textShadow: "0 0 30px rgba(249, 115, 22, 0.4)"
  },
  homeTitle: {
    fontSize: "22px",
    color: "#f0f0f0",
    letterSpacing: "6px",
    fontWeight: "bold",
    lineHeight: 1.2,
    marginBottom: "10px"
  },
  homeSubtitle: {
    fontSize: "10px",
    color: "#64748b",
    letterSpacing: "3px",
    fontFamily: "'Courier New', monospace"
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "32px"
  },
  calcCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    width: "100%",
    background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid #334155",
    borderRadius: "14px",
    padding: "20px",
    cursor: "pointer",
    color: "#f0f0f0",
    textAlign: "left",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)"
  },
  cardIcon: {
    fontSize: "28px",
    color: "#fdba74",
    width: "52px",
    height: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#7c2d12",
    borderRadius: "12px",
    border: "1px solid #f97316",
    flexShrink: 0
  },
  cardBody: {
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    fontSize: "14px",
    letterSpacing: "2px",
    fontWeight: "bold",
    color: "#f0f0f0",
    marginBottom: "4px"
  },
  cardSubtitle: {
    fontSize: "10px",
    color: "#64748b",
    letterSpacing: "1px",
    fontFamily: "'Courier New', monospace"
  },
  cardArrow: {
    fontSize: "18px",
    color: "#475569",
    flexShrink: 0,
    fontFamily: "'Courier New', monospace"
  },
  homeFooter: {
    textAlign: "center",
    fontSize: "9px",
    color: "#475569",
    letterSpacing: "2px",
    fontFamily: "'Courier New', monospace",
    marginTop: "40px"
  }
};
