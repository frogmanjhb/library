/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#FF6B6B",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#FBBF24",
          foreground: "#1c1917",
        },
        accent: {
          DEFAULT: "#38BDF8",
          foreground: "#1c1917",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        card: "0 4px 20px -4px rgba(255, 107, 107, 0.15), 0 2px 8px -2px rgba(0, 0, 0, 0.08)",
        cardHover: "0 12px 32px -8px rgba(255, 107, 107, 0.2), 0 4px 12px -4px rgba(0, 0, 0, 0.1)",
        button: "0 2px 12px -2px rgba(255, 107, 107, 0.4)",
        buttonHover: "0 4px 16px -4px rgba(255, 107, 107, 0.5)",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 40px rgba(255, 107, 107, 0.7), 0 0 80px rgba(255, 107, 107, 0.4)" },
          "50%": { boxShadow: "0 0 56px rgba(255, 107, 107, 1), 0 0 120px rgba(255, 107, 107, 0.6)" },
        },
        "glow-pulse-subtle": {
          "0%, 100%": { filter: "drop-shadow(0 0 8px rgba(255, 107, 107, 0.7))" },
          "50%": { filter: "drop-shadow(0 0 14px rgba(255, 107, 107, 1))" },
        },
        "pulse-scale": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
        "pulse-scale-subtle": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "glow-pulse-slow": "glow-pulse 10s ease-in-out infinite",
        "glow-pulse-subtle": "glow-pulse-subtle 2.5s ease-in-out infinite",
        "glow-pulse-subtle-tabs": "glow-pulse-subtle 4s ease-in-out infinite",
        "pulse-scale": "pulse-scale 2s ease-in-out infinite",
        "pulse-scale-slow": "pulse-scale 10s ease-in-out infinite",
        "pulse-scale-subtle": "pulse-scale-subtle 2.5s ease-in-out infinite",
        "pulse-scale-subtle-tabs": "pulse-scale-subtle 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
