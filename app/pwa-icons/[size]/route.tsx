import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeStr } = await params;
  const size = sizeStr === "512" ? 512 : 192;

  const url = new URL(request.url);
  const logoUrl = `${url.protocol}//${url.host}/logo.png`;

  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} width={size} height={size} alt="" />
    ),
    { width: size, height: size }
  );
}
