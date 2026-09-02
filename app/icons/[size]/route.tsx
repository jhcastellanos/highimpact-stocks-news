import { ImageResponse } from "next/og";

export async function GET(_: Request, context: { params: Promise<{ size: string }> }) {
  const { size } = await context.params;
  const n = Number(size);
  const dim = n === 512 ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a2b48",
          color: "#f37a5b",
          fontSize: dim / 3,
          fontWeight: 700,
          letterSpacing: -2,
          border: `${Math.round(dim / 32)}px solid #3d5278`,
        }}
      >
        MI
      </div>
    ),
    { width: dim, height: dim },
  );
}
