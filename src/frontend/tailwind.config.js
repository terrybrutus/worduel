import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        "input-focused": "oklch(var(--input-focused))",
        "input-error": "oklch(var(--input-error))",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "oklch(var(--success) / <alpha-value>)",
          foreground: "oklch(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      scale: {
        102: "1.02",
        98: "0.98",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        subtle: "0 2px 20px oklch(var(--primary) / 0.12)",
      },
      keyframes: {
        reveal: {
          "0%": { opacity: "0", transform: "scale(0.8) rotateY(90deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotateY(0deg)" },
        },
        tileFlip: {
          "0%": { transform: "scaleY(1) rotateX(0deg)", opacity: "1" },
          "50%": { transform: "scaleY(0) rotateX(90deg)", opacity: "0" },
          "100%": { transform: "scaleY(1) rotateX(0deg)", opacity: "1" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "invalid-pulse": {
          "0%, 100%": { borderColor: "oklch(var(--input-error))" },
          "50%": { borderColor: "oklch(var(--input-error) / 0.5)" },
        },
        "loss-reveal": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "worduel-slide-down": {
          from: { transform: "translateY(-100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        reveal: "reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "tile-flip": "tileFlip 0.6s ease-in-out",
        "bounce-in": "bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "pulse-subtle": "pulse-subtle 1.5s ease-in-out infinite",
        shake: "shake 0.4s ease-in-out",
        "shake-feedback": "shake-feedback 0.4s ease-in-out",
        "invalid-pulse": "invalid-pulse 0.5s ease-in-out",
        "loss-reveal": "loss-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "confetti-fall": "confettiFall 3s ease-out forwards",
        "float-emoji": "floatEmoji 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "worduel-slide-down": "worduel-slide-down 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
