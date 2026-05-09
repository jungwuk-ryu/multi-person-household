import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/client/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        "soft-black": "#1C1C1E",
        canvas: "#FAF8F4",
        cloud: "#F1F1F1",
        line: "#E6E3DE",
        muted: "#77746E",
        coral: "#FF5A66",
        "coral-light": "#FFECEF",
        "coral-pressed": "#E84755",
        morning: "#FFD6B8",
        noon: "#FFE66D",
        evening: "#CBB7FF",
        night: "#1F2A44",
        friend: "#2ED47A",
        link: "#3478F6"
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Inter",
          "SF Pro Display",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "system-ui",
          "sans-serif"
        ],
        mono: ["SF Mono", "Roboto Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        card: "0 1px 0 rgba(17, 17, 17, 0.04), 0 8px 24px rgba(17, 17, 17, 0.08)",
        sheet: "0 -12px 40px rgba(17, 17, 17, 0.16)",
        coral: "0 8px 22px rgba(255, 90, 102, 0.28)"
      }
    }
  },
  plugins: []
} satisfies Config;
