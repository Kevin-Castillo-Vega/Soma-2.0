/*
  Soma — Tailwind config
  Ver docs/identidad-visual.md para el sistema completo (paleta, tipografía, radios, glass).
  borderRadius sobreescribe sm/md/lg/xl a propósito: son los valores del sistema de
  diseño, no los defaults de Tailwind — no "corregir" a los valores estándar.
*/
module.exports = {
	content: ["./index.html", "./src/front/**/*.{js,jsx}"],
	theme: {
		extend: {
			colors: {
				paper: { DEFAULT: "#FCFAF7", alt: "#F4EEE6" },
				ink: { DEFAULT: "#1C1815", soft: "#4A4038", faint: "#8C8177" },
				nude: { DEFAULT: "#E7D6C4", deep: "#D9C3A9" },
				beige: "#D3BC9C",
				cafe: { DEFAULT: "#5A3826", soft: "#8A6349" },
				success: { bg: "#E4E9DC", text: "#4F6142" },
				warning: { bg: "#F3E4C8", text: "#8A5A18" },
				error: { bg: "#F3DCD4", text: "#9C4632" }
			},
			borderRadius: {
				xs: "10px",
				sm: "16px",
				md: "24px",
				lg: "32px",
				xl: "40px",
				full: "9999px"
			},
			boxShadow: {
				soft: "0 8px 28px rgba(28,24,21,.10)",
				card: "0 4px 16px rgba(28,24,21,.06)",
				glass: "0 12px 36px rgba(28,24,21,.18)"
			},
			backdropBlur: {
				glass: "18px"
			},
			fontFamily: {
				display: ["Fraunces", "ui-serif", "Georgia", "serif"],
				body: ['"Plus Jakarta Sans"', "-apple-system", '"Segoe UI"', "sans-serif"],
				data: ['"JetBrains Mono"', "ui-monospace", '"SF Mono"', "Consolas", "monospace"]
			}
		}
	},
	plugins: []
};
