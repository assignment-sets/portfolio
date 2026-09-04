import { ImageResponse } from "next/og";

export const alt = "Gourab Mondal | Full Stack Developer";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0c0c0c",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "Georgia, serif",
          color: "#eaeaea",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
            }}
          />
          <span style={{ fontSize: "24px", color: "#949494" }}>
            Available for work · Kolkata, India
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1
            style={{
              fontSize: "64px",
              fontWeight: "normal",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Gourab Mondal
          </h1>
          <p
            style={{
              fontSize: "30px",
              color: "#949494",
              margin: 0,
              lineHeight: 1.4,
              maxWidth: "900px",
            }}
          >
            Full Stack Developer specializing in backend architectures and GenAI applications.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #222",
            paddingTop: "32px",
            fontSize: "22px",
            color: "#666",
          }}
        >
          <span>gourabmondal.vercel.app</span>
          <span>FastAPI · Spring Boot · React · LangGraph · Docker</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
