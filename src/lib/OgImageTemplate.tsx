import type { CSSProperties } from "react";

const background = "#f3f1ee";
const ink = "#111111";
const muted = "#6f685f";
const card = "#ffffff";
const stroke = "rgba(0,0,0,0.06)";

function cellStyle(): CSSProperties {
  return {
    width: 180,
    height: 180,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: card,
    boxShadow: `0 0 0 1px ${stroke}`,
  };
}

export default function OgImageTemplate({ code, label }: { code: string; label: string }) {
  const letters = code.slice(0, 4).split("");

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: background,
        padding: 48,
        boxSizing: "border-box",
        fontFamily: "LXGW Neo XiHei",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: muted,
          fontSize: 28,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        <div style={{ display: "flex" }}>VCTI</div>
        <div style={{ display: "flex" }}>Vibe-Coder Type Indicator</div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
          }}
        >
          <div style={{ display: "flex", gap: 22 }}>
            {letters.slice(0, 2).map((letter) => (
              <div key={`top-${letter}`} style={cellStyle()}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "LXGW WenKai",
                    fontSize: 124,
                    lineHeight: 1,
                    color: ink,
                  }}
                >
                  {letter}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 22 }}>
            {letters.slice(2, 4).map((letter) => (
              <div key={`bottom-${letter}`} style={cellStyle()}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "LXGW WenKai",
                    fontSize: 124,
                    lineHeight: 1,
                    color: ink,
                  }}
                >
                  {letter}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "LXGW WenKai",
            fontSize: 72,
            lineHeight: 1.05,
            color: ink,
          }}
        >
          {code}
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 560,
            textAlign: "right",
            color: muted,
            fontSize: 28,
            lineHeight: 1.45,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
