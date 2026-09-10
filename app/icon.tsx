import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Generated at build/request time via next/og — same zero-dependency
// pattern as app/g/[username]/opengraph-image.tsx. No binary asset to
// source or license (build plan §14: everything free, no media service).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f2a1f",
          fontSize: 22,
        }}
      >
        🌱
      </div>
    ),
    { ...size }
  );
}
