import { ImageResponse } from "next/og";

export const alt =
  "PPIM Consulting — licensed immigration adviser, Auckland, New Zealand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(180deg, #081420 0%, #0d1d2e 100%)",
          color: "#faf8f3",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              padding: "14px 22px",
              borderRadius: 16,
              background: "#c08f2c",
              color: "#081420",
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            PPIM
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40 }}>PPIM Consulting</div>
            <div
              style={{
                fontSize: 20,
                letterSpacing: 4,
                color: "rgba(250,248,243,0.6)",
              }}
            >
              PRIYA PRATAP IMMIGRATION CONSULTING
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 68, lineHeight: 1.1 }}>
            Your pathway to&nbsp;
            <span style={{ color: "#d0a43f" }}>New Zealand</span>
          </div>
          <div style={{ fontSize: 30, color: "rgba(250,248,243,0.75)" }}>
            Licensed immigration advice — Auckland, Nadi &amp; Suva
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 24,
            color: "#ddbb63",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              border: "2px solid rgba(208,164,63,0.45)",
            }}
          >
            IAA License No. 201100160
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              border: "2px solid rgba(208,164,63,0.45)",
            }}
          >
            Australia MARN 2217960
          </div>
        </div>
      </div>
    ),
    size
  );
}
