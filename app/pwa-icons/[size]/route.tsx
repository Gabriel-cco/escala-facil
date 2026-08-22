import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeStr } = await params;
  const size = sizeStr === "512" ? 512 : 192;
  const isMaskable = new URL(request.url).searchParams.has("maskable");

  // Maskable: fundo branco com padding de 10% (zona segura do Android)
  const padding = isMaskable ? Math.round(size * 0.1) : 0;
  const innerSize = size - padding * 2;
  const radius = Math.round(innerSize * 0.18);
  const fontSize = Math.round(innerSize * 0.42);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: isMaskable ? "#FAF6EC" : "#6B3521",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: innerSize,
            height: innerSize,
            background: "#6B3521",
            borderRadius: radius,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize,
              fontWeight: 700,
              fontFamily: "sans-serif",
              letterSpacing: -2,
            }}
          >
            EF
          </span>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
