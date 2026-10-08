import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Should you overpay your student loan? A UK student loan calculator.";

// The preview card shown when the link is shared in email, Slack, LinkedIn and so on.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 36, fontWeight: 600 }}>
          <div
            style={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#2563eb",
              borderRadius: 14,
              color: "white",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            £
          </div>
          Overpay or not?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            Should you overpay your student loan?
          </div>
          <div style={{ fontSize: 34, color: "#475569", lineHeight: 1.35 }}>
            See whether paying extra saves you money, or just pays off debt that gets written off.
          </div>
        </div>
        <div style={{ fontSize: 26, color: "#2563eb", fontWeight: 600 }}>UK student loans · 2026-27 rules · Plans 1, 2, 4, 5 and Postgraduate</div>
      </div>
    ),
    size,
  );
}
