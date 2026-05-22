import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const safeArea = plugin(({ addUtilities }) => {
  addUtilities({
    ".pt-safe": { paddingTop: "env(safe-area-inset-top, 0px)" },
    ".pb-safe": { paddingBottom: "env(safe-area-inset-bottom, 0px)" },
    ".pl-safe": { paddingLeft: "env(safe-area-inset-left, 0px)" },
    ".pr-safe": { paddingRight: "env(safe-area-inset-right, 0px)" },
    ".mb-safe": { marginBottom: "env(safe-area-inset-bottom, 0px)" },
    ".mt-safe": { marginTop: "env(safe-area-inset-top, 0px)" },
  });
});

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "448px",
      },
    },
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Phase 3 (D-15): soft warm yellow para urgencia de riego.
        // Usado por PlantWateringCard badge "X d" cuando X <= 0.
        softWarn: "hsl(var(--soft-warn))",
        softWarnBg: "hsl(var(--soft-warn-bg))",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        // Phase 3 sub-phase 3-03 (D-12): flash green 1s tras log de riego.
        // No usar bg-primary directamente (cambio brusco) — un fade suave 20%→0%
        // con el color primario via box-shadow inset evita repaint completo del card.
        "flash-success": {
          "0%": {
            boxShadow:
              "inset 0 0 0 9999px hsl(var(--primary) / 0.2), 4px 4px 0 0 hsl(var(--foreground))",
          },
          "100%": {
            boxShadow:
              "inset 0 0 0 9999px hsl(var(--primary) / 0), 4px 4px 0 0 hsl(var(--foreground))",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        // 1s ease-out, runs once (no infinite). PlantWateringCard applies
        // `animate-flash-success` via React state for 1s after logging,
        // then removes the class.
        "flash-success": "flash-success 1s ease-out forwards",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography"), safeArea],
} satisfies Config;
