import { ImageResponse } from "next/og";

export const alt = "SWEDLE — daily puzzle games for software engineers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#12100e",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 36,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background:
                  i === 1
                    ? "#c49b6a"
                    : i === 2
                      ? "rgba(235,231,224,0.28)"
                      : i === 4
                        ? "#c4a574"
                        : "#9eb38f",
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#ebe7e0",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          SWEDLE
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            color: "#c4a574",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Daily puzzles for software engineers
        </div>
      </div>
    ),
    { ...size },
  );
}
