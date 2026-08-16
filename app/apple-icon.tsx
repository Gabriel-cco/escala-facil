import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#4F46E5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "white", fontSize: 80, fontWeight: 700, fontFamily: "sans-serif" }}>
          EF
        </span>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
